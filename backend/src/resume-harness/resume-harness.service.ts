import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ResumeHarnessSession,
  ResumeHarnessSessionDocument,
} from './schemas/resume-harness-session.schema';
import { ModelAliasService } from './model-alias.service';
import { CandidateContextService } from './candidate-context.service';
import { ContextFilesService } from './context-files.service';
import { HarnessRegistry } from './harness/harness.registry';
import { SandboxService, SANDBOX_WORKDIR } from './sandbox/sandbox.service';
import {
  BUILD_COMMAND,
  LatexService,
  PDF_PATH,
  TEX_PATH,
} from './latex/latex.service';
import {
  HarnessContextFile,
  HarnessId,
  ResolvedModelAlias,
} from './harness/harness.types';

export interface StartSessionInput {
  harness: HarnessId;
  /** Optional explicit alias; must be one the caller's tier permits. */
  alias?: string;
  /** Role this résumé targets. A per-résumé input, not a profile fact. */
  targetRole?: string;
  /** Pasted job description to tailor against. Also per-résumé. */
  jobDescription?: string;
  /** Session whose LaTeX artifact should seed this one. */
  carryFromSessionId?: string;
}

export interface RunTurnInput {
  instruction: string;
  /**
   * Optional client-side assertion of which harness it thinks it is talking to.
   * A mismatch is an error, never a switch.
   */
  harness?: HarnessId;
}

export interface SessionView {
  id: string;
  harness: HarnessId;
  harnessLabel: string;
  sandboxId?: string;
  alias: string;
  provider: string;
  model: string;
  effort: string;
  modelLabel: string;
  status: string;
  latex: string;
  revision: number;
  compiled: boolean;
  compileLog?: string;
  carriedFrom?: string;
  createdAt?: Date;
}

export interface TurnResult extends SessionView {
  summary?: string;
  pdfBase64?: string;
}

/** How many times the harness is asked to fix its own build before giving up. */
const MAX_COMPILE_REPAIRS = 2;

/**
 * Orchestrates a resume session: pick a harness, get a sandbox, run turns
 * against one LaTeX file, tear down.
 *
 * The three harnesses are interchangeable behind `HarnessRegistry`, so this
 * service contains no per-harness branching and the HTTP contract does not
 * change when the caller picks a different one.
 */
@Injectable()
export class ResumeHarnessService {
  private readonly logger = new Logger(ResumeHarnessService.name);

  constructor(
    @InjectModel(ResumeHarnessSession.name)
    private readonly sessionModel: Model<ResumeHarnessSessionDocument>,
    private readonly modelAlias: ModelAliasService,
    private readonly candidateContext: CandidateContextService,
    private readonly contextFiles: ContextFilesService,
    private readonly registry: HarnessRegistry,
    private readonly sandbox: SandboxService,
    private readonly latex: LatexService,
  ) {}

  /** Harness + model choices the caller may make, for the picker UI. */
  async options(userId: string) {
    const [aliases, tier, sandboxAvailable, context] = await Promise.all([
      this.modelAlias.listForUser(userId),
      this.modelAlias.tierFor(userId),
      this.sandbox.isAvailable(),
      this.candidateContext.build(userId),
    ]);
    return {
      tier,
      harnesses: this.registry
        .list()
        .map((h) => ({ id: h.id, label: h.displayName })),
      models: aliases,
      sandboxAvailable,
      /**
       * What the résumé will be written from. Surfaced so the screen can show
       * the candidate which of their own facts are in play, and send them to
       * Settings for the gaps — rather than asking them to retype it here.
       */
      profile: {
        ...context.summary,
        /** Required identity fields still missing — these block generation. */
        missing: context.missing,
        /** Optional history worth adding, or importing from LinkedIn. */
        optionalGaps: context.optionalGaps,
        ready: context.hasEnoughToGenerate,
      },
    };
  }

  async startSession(
    userId: string,
    input: StartSessionInput,
  ): Promise<SessionView> {
    const adapter = this.registry.get(input.harness);
    // Resolved from the tier at request time; an out-of-tier alias throws here
    // rather than being quietly downgraded.
    const alias = await this.modelAlias.resolveForUser(userId, input.alias);

    const carried = input.carryFromSessionId
      ? await this.mustFind(userId, input.carryFromSessionId)
      : null;

    const session = await this.sessionModel.create({
      userId,
      harness: input.harness,
      alias: alias.alias,
      provider: alias.provider,
      model: alias.model,
      effort: alias.effort,
      modelLabel: alias.label,
      tier: alias.tier,
      status: 'active',
      targetRole: input.targetRole,
      jobDescription: input.jobDescription,
      latex: carried?.latex || '',
      revision: 0,
      compiled: false,
      carriedFrom: carried ? carried._id : undefined,
      turns: [],
    });

    // The candidate's own facts, retrieved once per session and written into
    // the sandbox. This is what lets the shared rules forbid invention: the
    // real employers and dates are on disk, so there is nothing to guess.
    const context = await this.candidateContext.build(userId);

    const sessionId = String((session as any)._id);
    const boot = adapter.bootstrap({
      sessionId,
      workdir: SANDBOX_WORKDIR,
      proxy: this.proxyAuth(),
      alias,
      contextFiles: this.contextFiles.filesFor(input.harness, {
        workdir: SANDBOX_WORKDIR,
        texPath: TEX_PATH,
        pdfPath: PDF_PATH,
        buildCommand: BUILD_COMMAND,
        candidateMarkdown: this.withTarget(context.markdown, session as any),
      }),
    });

    // Carrying the artifact forward is the supported way to change harness, so
    // the new sandbox starts with the existing resume already on disk.
    const files: HarnessContextFile[] = carried?.latex
      ? [...boot.files, { path: TEX_PATH, contents: carried.latex }]
      : boot.files;

    const { sandboxId } = await this.sandbox.provision({
      sessionId,
      harness: input.harness,
      env: boot.env,
      files,
    });

    (session as any).sandboxId = sandboxId;
    await (session as any).save();

    return this.view(session);
  }

  async getSession(userId: string, sessionId: string): Promise<SessionView> {
    return this.view(await this.mustFind(userId, sessionId));
  }

  /** The compiled PDF for the session's current revision, if it has one. */
  async getPdf(userId: string, sessionId: string): Promise<string | null> {
    const session = await this.mustFind(userId, sessionId);
    if (!session.sandboxId || session.status !== 'active') return null;
    return this.sandbox.readFileBase64(session.sandboxId, PDF_PATH);
  }

  /**
   * One create-or-update turn.
   *
   * Create and update are the same call on purpose: the harness is told to
   * create `resume.tex` if it is absent and edit it in place if it is not, and
   * the frontend does not have to know which it is asking for.
   */
  /**
   * A turn, reporting progress as it happens.
   *
   * Identical to `runTurn` except that the harness's own narration is forwarded
   * through `onEvent` while it works. A turn runs for tens of seconds; without
   * this the screen can only show a spinner, and a candidate cannot tell a
   * model thinking from a container that has hung.
   */
  async runTurnStreaming(
    userId: string,
    sessionId: string,
    input: RunTurnInput,
    onEvent: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    return this.runTurn(userId, sessionId, input, onEvent);
  }

  async runTurn(
    userId: string,
    sessionId: string,
    input: RunTurnInput,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    const session = await this.mustFind(userId, sessionId);

    if (input.harness && input.harness !== session.harness) {
      throw new ConflictException(
        `This session runs on ${session.harness} and cannot be switched to ${input.harness}. ` +
          'Start a new session on the other harness — the resume is carried forward.',
      );
    }
    if (session.status !== 'active') {
      throw new ConflictException(
        'This session has ended. Start a new one to keep working.',
      );
    }
    if (!session.sandboxId) {
      throw new ServiceUnavailableException(
        'This session has no sandbox bound to it.',
      );
    }

    const adapter = this.registry.get(session.harness);
    const boot = adapter.bootstrap({
      sessionId,
      workdir: SANDBOX_WORKDIR,
      proxy: this.proxyAuth(),
      alias: this.aliasOf(session),
      contextFiles: [],
    });

    onEvent?.({ type: 'phase', phase: 'writing' });
    let summary = await this.invoke(
      adapter,
      boot,
      session.sandboxId,
      this.turnPrompt(session, input.instruction),
      onEvent,
    );

    onEvent?.({ type: 'phase', phase: 'compiling' });
    let compile = await this.latex.compile(session.sandboxId);

    // A LaTeX error is a normal step in writing LaTeX. Hand the log back and
    // let the harness fix it rather than failing the user's request.
    for (let attempt = 0; !compile.ok && attempt < MAX_COMPILE_REPAIRS; attempt++) {
      onEvent?.({
        type: 'phase',
        phase: 'fixing',
        log: compile.log.slice(0, 400),
      });
      summary = await this.invoke(
        adapter,
        boot,
        session.sandboxId,
        this.repairPrompt(compile.log),
        onEvent,
      );
      onEvent?.({ type: 'phase', phase: 'compiling' });
      compile = await this.latex.compile(session.sandboxId);
    }

    const latex =
      (await this.sandbox.readFile(session.sandboxId, TEX_PATH)) ??
      session.latex;

    session.latex = latex;
    session.revision = (session.revision || 0) + 1;
    session.compiled = compile.ok;
    session.compileLog = compile.ok ? undefined : compile.log;
    session.turns.push({
      instruction: input.instruction,
      revision: session.revision,
      compiled: compile.ok,
      compileLog: compile.ok ? undefined : compile.log,
      summary,
      createdAt: new Date(),
    } as any);
    await (session as any).save();

    return {
      ...this.view(session),
      summary,
      pdfBase64: compile.pdfBase64 || undefined,
    };
  }

  async endSession(userId: string, sessionId: string): Promise<SessionView> {
    const session = await this.mustFind(userId, sessionId);
    if (session.status === 'active' && session.sandboxId) {
      await this.sandbox.destroy(session.sandboxId);
    }
    session.status = 'ended';
    session.endedAt = new Date();
    await (session as any).save();
    return this.view(session);
  }

  // ------------------------------------------------------------- internals ---

  private async invoke(
    adapter: ReturnType<HarnessRegistry['get']>,
    boot: ReturnType<ReturnType<HarnessRegistry['get']>['bootstrap']>,
    sandboxId: string,
    prompt: string,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<string | undefined> {
    const result = onEvent
      ? await this.sandbox.execStream(
          sandboxId,
          adapter.turnCommand(boot, prompt),
          (chunk) => onEvent({ type: 'token', text: chunk }),
          { timeoutSeconds: 900 },
        )
      : await this.sandbox.exec(
          sandboxId,
          adapter.turnCommand(boot, prompt),
          { timeoutSeconds: 900 },
        );
    if (result.exitCode !== 0) {
      this.logger.warn(
        `${adapter.id} exited ${result.exitCode}: ${result.stderr?.slice(0, 400)}`,
      );
    }
    return (result.stdout || '').trim().split('\n').filter(Boolean).pop();
  }

  private turnPrompt(
    session: ResumeHarnessSessionDocument,
    instruction: string,
  ): string {
    const mode = session.revision > 0 || session.latex ? 'update' : 'create';
    return [
      mode === 'create'
        ? `Create ${TEX_PATH} from scratch.`
        : `Update the existing ${TEX_PATH} in place. Preserve everything the instruction does not ask you to change.`,
      '',
      'Instruction:',
      instruction,
      '',
      `When you are done, run the build command from AGENTS.md and make sure it exits 0.`,
    ].join('\n');
  }

  private repairPrompt(log: string): string {
    return [
      `The build failed. Fix ${TEX_PATH} so that the build command succeeds.`,
      'Do not delete content to make the error go away.',
      '',
      'Compiler output:',
      log,
    ].join('\n');
  }

  /**
   * Appends the per-résumé target to the candidate's facts.
   *
   * The target role and job description are session inputs rather than profile
   * facts, but the harness reads one file, so they are appended here with an
   * explicit note that a JD describes what an employer wants — never something
   * the candidate may claim.
   */
  private withTarget(
    markdown: string,
    session: { targetRole?: string; jobDescription?: string },
  ): string {
    if (!session.targetRole && !session.jobDescription) return markdown;

    const parts = [markdown, '## This résumé', ''];
    if (session.targetRole) parts.push(`- Target role: ${session.targetRole}`);
    if (session.jobDescription) {
      parts.push(
        '',
        'Job description to tailor against. It states what the employer is',
        'looking for; it is NOT a list of things the candidate has done. Use it',
        'to choose what to emphasise and how to word it, never to add a skill or',
        'responsibility that CANDIDATE.md does not support.',
        '',
        '```',
        session.jobDescription.slice(0, 12000),
        '```',
      );
    }
    return `${parts.join('\n')}\n`;
  }

  private aliasOf(session: ResumeHarnessSessionDocument): ResolvedModelAlias {
    return {
      alias: session.alias,
      provider: session.provider,
      model: session.model,
      effort: session.effort,
      label: session.modelLabel,
      tier: session.tier,
    };
  }

  /**
   * The proxy every harness talks to. The key is a LiteLLM virtual key —
   * metered and revocable — and is the only credential a sandbox receives.
   */
  private proxyAuth() {
    // The URL as seen FROM INSIDE the sandbox, which is not the URL the backend
    // uses: a container on the proxy's network reaches it by service name, and
    // `localhost` there would be the sandbox itself.
    const baseUrl =
      process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL ||
      process.env.LITELLM_BASE_URL ||
      'http://localhost:4000';
    const apiKey =
      process.env.RESUME_HARNESS_LITELLM_KEY ||
      process.env.LITELLM_API_KEY ||
      '';
    return { baseUrl: baseUrl.replace(/\/v1\/?$/, ''), apiKey };
  }

  private async mustFind(
    userId: string,
    sessionId: string,
  ): Promise<ResumeHarnessSessionDocument> {
    const session = await this.sessionModel
      .findOne({ _id: sessionId, userId })
      .exec();
    if (!session) throw new NotFoundException('Resume session not found');
    return session;
  }

  private view(session: any): SessionView {
    return {
      id: String(session._id),
      harness: session.harness,
      harnessLabel: this.registry.get(session.harness).displayName,
      sandboxId: session.sandboxId,
      alias: session.alias,
      provider: session.provider,
      model: session.model,
      effort: session.effort,
      modelLabel: session.modelLabel,
      status: session.status,
      latex: session.latex || '',
      revision: session.revision || 0,
      compiled: Boolean(session.compiled),
      compileLog: session.compileLog,
      carriedFrom: session.carriedFrom ? String(session.carriedFrom) : undefined,
      createdAt: session.createdAt,
    };
  }
}
