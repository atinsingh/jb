import {
  BadRequestException,
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
  ResumeHarnessTurn,
} from './schemas/resume-harness-session.schema';
import { StorageService } from '../storage/storage.service';
import { ModelAliasService } from './model-alias.service';
import { CandidateContextService } from './candidate-context.service';
import {
  ContextFilesService,
  TemplateCondition,
} from './context-files.service';
import {
  ResumeTemplateService,
  TemplateView,
  VibeState,
} from './resume-template.service';
import { HarnessRegistry } from './harness/harness.registry';
import { SandboxService, SANDBOX_WORKDIR } from './sandbox/sandbox.service';
import {
  BUILD_COMMAND,
  LatexService,
  PDF_PATH,
  TEX_PATH,
} from './latex/latex.service';
import { findContentProblems } from './latex/content-guard';
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
  /** Template to write to. Omitted means the carried one, then the default. */
  templateKey?: string;
  /** Initial knob choices over that template. */
  vibe?: VibeState;
}

export interface RunTurnInput {
  instruction: string;
  /**
   * Optional client-side assertion of which harness it thinks it is talking to.
   * A mismatch is an error, never a switch.
   */
  harness?: HarnessId;
}

export interface SelectTemplateInput {
  templateKey: string;
  /** Knob choices to apply along with the switch. */
  vibe?: VibeState;
}

export interface ApplyVibeInput {
  vibe: VibeState;
}

export interface SessionView {
  id: string;
  name: string;
  targetRole?: string;
  revisionCount: number;
  hasCurrentPdf: boolean;
  turns: Array<Omit<ResumeHarnessTurn, 'pdfKey'> & { hasPdf: boolean }>;
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
  /**
   * Ways the current revision still reads as a template rather than a résumé.
   * Empty on a healthy document. A passing build does not imply this is empty.
   */
  contentWarnings: string[];
  carriedFrom?: string;
  /** Template in force, by key. Freely changeable, unlike `harness`. */
  templateKey?: string;
  /** Knob choices in force. */
  vibe: VibeState;
  /** Whether one step back to the previous look is available. */
  canRevert: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  endedAt?: Date;
  archivedAt?: Date;
}

export interface TurnResult extends SessionView {
  summary?: string;
  pdfBase64?: string;
}

/** How many times the harness is asked to fix its own build before giving up. */
const MAX_COMPILE_REPAIRS = 2;
/** A crashed process may hold the unique provisioning slot only this long. */
const PROVISIONING_LEASE_MS = 2 * 60 * 1000;

/**
 * Orchestrates a resume session: pick a harness, get a sandbox, run turns
 * against one LaTeX file, tear down.
 *
 * The three harnesses are interchangeable behind `HarnessRegistry`, so this
 * service contains no per-harness branching and the HTTP contract does not
 * change when the caller picks a different one.
 *
 * Two things are mutable for the life of a session and one is not. The template
 * and the look can be changed at any point, because doing so is a re-apply of
 * content the session already holds. The harness cannot, because that would
 * mean rebinding a live sandbox and rehydrating agent state — so the supported
 * path is a new session with the artifact, template and look carried forward.
 */
@Injectable()
export class ResumeHarnessService {
  private readonly logger = new Logger(ResumeHarnessService.name);
  private readonly startTails = new Map<string, Promise<void>>();
  private readonly mutationTails = new Map<string, Promise<void>>();

  constructor(
    @InjectModel(ResumeHarnessSession.name)
    private readonly sessionModel: Model<ResumeHarnessSessionDocument>,
    private readonly modelAlias: ModelAliasService,
    private readonly candidateContext: CandidateContextService,
    private readonly contextFiles: ContextFilesService,
    private readonly templates: ResumeTemplateService,
    private readonly registry: HarnessRegistry,
    private readonly sandbox: SandboxService,
    private readonly latex: LatexService,
    private readonly storage: StorageService,
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

  /** The seeded template catalogue, for the picker. */
  listTemplates(): Promise<TemplateView[]> {
    return this.templates.list();
  }

  async startSession(
    userId: string,
    input: StartSessionInput,
  ): Promise<SessionView> {
    return this.withUserStartLock(userId, () =>
      this.startSessionLocked(userId, input),
    );
  }

  private async startSessionLocked(
    userId: string,
    input: StartSessionInput,
  ): Promise<SessionView> {
    const adapter = this.registry.get(input.harness);
    // Resolved from the tier at request time; an out-of-tier alias throws here
    // rather than being quietly downgraded.
    const alias = await this.modelAlias.resolveForUser(userId, input.alias);

    const carriedState = input.carryFromSessionId
      ? await this.withSessionMutationLock(
          userId,
          input.carryFromSessionId,
          async () => {
            const session = await this.mustFind(
              userId,
              input.carryFromSessionId!,
            );
            const pdf =
              session.compiled && session.pdfKey
                ? await this.storage.getBuffer(session.pdfKey)
                : undefined;
            return { session, pdf };
          },
        )
      : null;
    const carried = carriedState?.session;

    // The template and look this session runs under. A carried-forward session
    // brings its own, so changing harness never silently resets the look.
    const look = await this.templates.resolve(
      input.templateKey,
      input.vibe,
      carried
        ? { templateKey: carried.templateKey, vibe: carried.vibe }
        : undefined,
    );

    // The candidate's own facts, retrieved once per session and written into
    // the sandbox. This is what lets the shared rules forbid invention: the
    // real employers and dates are on disk, so there is nothing to guess.
    // Built before the session document because the session records the name,
    // which later turns check the finished résumé actually contains.
    const context = await this.candidateContext.build(userId);
    const candidateMarkdown = this.withTarget(context.markdown, input);

    // One live container per user. A second Start (or a harness change)
    // replaces the old box rather than stacking until TTL.
    await this.endOtherLiveSessions(userId);

    const session = await this.sessionModel.create({
      userId,
      name: input.targetRole?.trim() || undefined,
      harness: input.harness,
      alias: alias.alias,
      provider: alias.provider,
      model: alias.model,
      effort: alias.effort,
      modelLabel: alias.label,
      tier: alias.tier,
      // Claim the user's one live-session slot before creating a container.
      // The partial unique index includes this state, so another backend
      // process cannot end a half-built session and orphan its sandbox.
      status: 'provisioning',
      targetRole: input.targetRole,
      jobDescription: input.jobDescription,
      candidateName: context.summary?.name,
      candidateMarkdown,
      templateKey: look.template?.key,
      vibe: look.vibe,
      latex: carried?.latex || '',
      revision: 0,
      compiled: false,
      carriedFrom: carried ? carried._id : undefined,
      turns: [],
    });

    const sessionId = String((session as any)._id);
    return this.withSessionMutationLock(userId, sessionId, async () => {
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
          candidateMarkdown,
          template: look.template
            ? this.templates.condition(look.template, look.vibe)
            : undefined,
        }),
      });

      // Carrying the artifact forward is the supported way to change harness, so
      // the new sandbox starts with the existing resume already on disk — under
      // the carried template's condition from its very first turn.
      const files: HarnessContextFile[] = carried?.latex
        ? [...boot.files, { path: TEX_PATH, contents: carried.latex }]
        : boot.files;

      let sandboxId: string | undefined;
      let copiedPdfKey: string | undefined;
      try {
        if (carried?.latex) {
          let pdfKey: string | undefined;
          if (carriedState?.pdf) {
            pdfKey = `resume-harness/${userId}/${sessionId}/revisions/1.pdf`;
            await this.storage.put(pdfKey, carriedState.pdf, {
              contentType: 'application/pdf',
            });
            copiedPdfKey = pdfKey;
          }
          session.revision = 1;
          session.compiled = carried.compiled;
          session.compileLog = carried.compileLog;
          session.contentWarnings = [...(carried.contentWarnings || [])];
          session.pdfKey = pdfKey;
          session.turns.push({
            instruction: 'Carried the résumé from the previous session.',
            kind: 'restore',
            revision: 1,
            latex: carried.latex,
            templateKey: carried.templateKey,
            vibe: { ...carried.vibe },
            compiled: carried.compiled,
            compileLog: carried.compileLog,
            contentWarnings: [...(carried.contentWarnings || [])],
            pdfKey,
            createdAt: new Date(),
          });
        }
        const provisioned = await this.sandbox.provision({
          sessionId,
          harness: input.harness,
          env: boot.env,
          files,
        });
        sandboxId = provisioned.sandboxId;
        (session as any).sandboxId = sandboxId;
        (session as any).status = 'active';
        await (session as any).save();
      } catch (error) {
        if (copiedPdfKey) {
          await this.deleteUncommittedPdf(copiedPdfKey);
          session.pdfKey = undefined;
          for (const turn of session.turns) {
            if (turn.pdfKey === copiedPdfKey) turn.pdfKey = undefined;
          }
        }
        if (sandboxId) {
          try {
            await this.sandbox.destroy(sandboxId);
          } catch (cleanupError) {
            this.logger.error(
              `Failed to clean up sandbox ${sandboxId} after session start failed`,
              cleanupError instanceof Error ? cleanupError.stack : undefined,
            );
          }
        }
        (session as any).status = 'failed';
        try {
          await (session as any).save();
        } catch {
          // Preserve the original start failure. The unique live-session index
          // excludes `failed`, and the sandbox has already been destroyed.
        }
        throw error;
      }

      return this.view(session);
    });
  }

  async getSession(userId: string, sessionId: string): Promise<SessionView> {
    return this.view(await this.mustFind(userId, sessionId));
  }

  async listSessions(userId: string): Promise<SessionView[]> {
    const sessions = await this.sessionModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .exec();
    return sessions.map((session) => this.view(session));
  }

  async renameSession(
    userId: string,
    sessionId: string,
    input: { name: string },
  ): Promise<SessionView> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.renameSessionLocked(userId, sessionId, input),
    );
  }

  private async renameSessionLocked(
    userId: string,
    sessionId: string,
    input: { name: string },
  ): Promise<SessionView> {
    const session = await this.mustFind(userId, sessionId);
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.trim().length > 200
    ) {
      throw new BadRequestException(
        'Session name must contain between 1 and 200 characters.',
      );
    }
    session.name = input.name.trim();
    await session.save();
    return this.view(session);
  }

  /** The compiled PDF for the session's current revision, if it has one. */
  async getPdf(userId: string, sessionId: string): Promise<string | null> {
    const session = await this.mustFind(userId, sessionId);
    if (!session.compiled || !session.pdfKey) return null;
    return (await this.storage.getBuffer(session.pdfKey)).toString('base64');
  }

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

  /**
   * One create-or-update turn.
   *
   * Create and update are the same call on purpose: the harness is told to
   * create `resume.tex` if it is absent and edit it in place if it is not, and
   * the frontend does not have to know which it is asking for.
   */
  async runTurn(
    userId: string,
    sessionId: string,
    input: RunTurnInput,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.runTurnLocked(userId, sessionId, input, onEvent),
    );
  }

  private async runTurnLocked(
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
    this.assertRunnable(session);

    return this.executeTurn(
      session,
      this.turnPrompt(session, input.instruction),
      input.instruction,
      onEvent,
    );
  }

  // ------------------------------------------------------ template and look ---

  /**
   * Switch the résumé to a different template, keeping its content.
   *
   * Template is not harness: nothing about the sandbox is rebound, so this is a
   * normal turn against a rewritten condition rather than a new session.
   */
  selectTemplate(
    userId: string,
    sessionId: string,
    input: SelectTemplateInput,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    return this.changeLook(
      userId,
      sessionId,
      input.templateKey,
      input.vibe,
      onEvent,
    );
  }

  /** Move the look dials on the current template, keeping its content. */
  applyVibe(
    userId: string,
    sessionId: string,
    input: ApplyVibeInput,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    return this.changeLook(userId, sessionId, undefined, input.vibe, onEvent);
  }

  /**
   * One transaction: rewrite the condition, then re-apply the résumé to it.
   *
   * The order is the point. The context files are written into the sandbox
   * *before* the turn is issued, and the session's own state is only advanced
   * once that write has succeeded — so a failed write leaves the session on the
   * condition it was already running under, and the harness is never asked to
   * honour a condition that never reached its disk.
   */
  private async changeLook(
    userId: string,
    sessionId: string,
    templateKey: string | undefined,
    vibe: VibeState | undefined,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.changeLookLocked(userId, sessionId, templateKey, vibe, onEvent),
    );
  }

  private async changeLookLocked(
    userId: string,
    sessionId: string,
    templateKey: string | undefined,
    vibe: VibeState | undefined,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
  ): Promise<TurnResult> {
    const session = await this.mustFind(userId, sessionId);
    this.assertRunnable(session);

    const before = {
      templateKey: session.templateKey,
      vibe: { ...(session.vibe || {}) },
    };

    const look = await this.templates.resolve(templateKey, vibe, before);
    if (!look.template) {
      throw new ConflictException(
        'This session has no template to change. Seed the catalogue with ' +
          '"npm run harness:seed-templates" and start a new session.',
      );
    }

    const condition = this.templates.condition(look.template, look.vibe);
    const changes = this.lookChanges(
      before,
      look.template.key,
      look.vibe,
      condition,
    );

    // Nothing actually moved. Returning the current state beats spending a
    // model turn to rewrite the document into what it already is.
    if (!changes.length) return this.view(session);

    // 1. The condition reaches the sandbox first. If this throws, nothing below
    //    runs and nothing about the session has changed.
    await this.sandbox.writeFiles(
      session.sandboxId!,
      this.contextFiles.filesFor(session.harness, {
        workdir: SANDBOX_WORKDIR,
        texPath: TEX_PATH,
        pdfPath: PDF_PATH,
        buildCommand: BUILD_COMMAND,
        template: condition,
      }),
    );

    // 2. Before there is a résumé, changing the look IS the whole operation.
    //    The condition is now on disk and the next Generate will honour it;
    //    running a turn here would spend the candidate's money producing a
    //    document they have not asked for yet, and would leave an empty
    //    snapshot behind for "back to previous look" to restore.
    if (!session.latex) {
      session.templateKey = look.template.key;
      session.vibe = look.vibe;
      await (session as any).save();
      return this.view(session);
    }

    session.templateKey = look.template.key;
    session.vibe = look.vibe;

    // The completed turn records both the selected look and its artifact.
    const instruction = this.lookInstruction(changes);
    return this.executeTurn(
      session,
      instruction,
      instruction,
      onEvent,
      'look-change',
    );
  }

  /**
   * Put the résumé back the way it looked before the last change.
   *
   * Restore the recorded source and PDF without running the harness or compiler.
   */
  async revertLook(userId: string, sessionId: string): Promise<TurnResult> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.revertLookLocked(userId, sessionId),
    );
  }

  private async revertLookLocked(
    userId: string,
    sessionId: string,
  ): Promise<TurnResult> {
    const session = await this.mustFind(userId, sessionId);
    const revision = this.revertRevision(session);
    if (revision === undefined) {
      throw new ConflictException(
        'There is no previous look to go back to on this session.',
      );
    }
    return this.restoreRevisionLocked(userId, sessionId, revision);
  }

  private revertRevision(session: ResumeHarnessSession): number | undefined {
    const turns = session.turns || [];
    for (let i = turns.length - 1; i > 0; i--) {
      if (turns[i].kind !== 'look-change') continue;
      const previous = turns[i - 1].revision;
      if (
        turns
          .slice(i + 1)
          .some(
            (turn) =>
              turn.kind === 'restore' && turn.restoredFromRevision === previous,
          )
      )
        return undefined;
      return previous;
    }
    return undefined;
  }

  async restoreRevision(
    userId: string,
    sessionId: string,
    revision: number,
  ): Promise<TurnResult> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.restoreRevisionLocked(userId, sessionId, revision),
    );
  }

  private async restoreRevisionLocked(
    userId: string,
    sessionId: string,
    revision: number,
  ): Promise<TurnResult> {
    const session = await this.mustFind(userId, sessionId);
    const snapshot = session.turns.find((turn) => turn.revision === revision);
    if (!snapshot) throw new NotFoundException('Resume revision not found');
    if (session.status === 'provisioning') {
      throw new ConflictException('Session is still starting.');
    }

    const files: HarnessContextFile[] = [
      { path: TEX_PATH, contents: snapshot.latex || '' },
    ];

    // Restore the rules too, or the next turn would run under the condition
    // being reverted away from.
    if (session.status === 'active') {
      this.assertRunnable(session);
      const look = snapshot.templateKey
        ? await this.templates.resolve(snapshot.templateKey, undefined, {
            templateKey: snapshot.templateKey,
            vibe: snapshot.vibe || {},
          })
        : undefined;
      files.push(
        ...this.contextFiles.filesFor(session.harness, {
          workdir: SANDBOX_WORKDIR,
          texPath: TEX_PATH,
          pdfPath: PDF_PATH,
          buildCommand: BUILD_COMMAND,
          template: look?.template
            ? this.templates.condition(look.template, look.vibe)
            : undefined,
        }),
      );
      if (!look?.template) files.push({ path: 'TEMPLATE.tex', contents: '' });
      await this.sandbox.writeFiles(session.sandboxId!, files);
    }

    session.latex = snapshot.latex || '';
    session.templateKey = snapshot.templateKey;
    session.vibe = { ...snapshot.vibe };
    session.revision = (session.revision || 0) + 1;
    session.compiled = snapshot.compiled;
    session.compileLog = snapshot.compileLog;
    session.contentWarnings = [...(snapshot.contentWarnings || [])];
    session.pdfKey = snapshot.compiled ? snapshot.pdfKey : undefined;
    session.turns.push({
      instruction: `Restored revision ${revision}.`,
      kind: 'restore',
      restoredFromRevision: revision,
      latex: session.latex,
      templateKey: session.templateKey,
      vibe: { ...session.vibe },
      pdfKey: session.pdfKey,
      revision: session.revision,
      compiled: session.compiled,
      compileLog: session.compileLog,
      contentWarnings: [...session.contentWarnings],
      summary: `Restored revision ${revision}.`,
      createdAt: new Date(),
    } as any);
    await (session as any).save();

    return {
      ...this.view(session),
      summary: `Restored revision ${revision}.`,
      pdfBase64: session.pdfKey
        ? (await this.storage.getBuffer(session.pdfKey)).toString('base64')
        : undefined,
    };
  }

  async endSession(userId: string, sessionId: string): Promise<SessionView> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.endSessionLocked(userId, sessionId),
    );
  }

  private async endSessionLocked(
    userId: string,
    sessionId: string,
  ): Promise<SessionView> {
    const session = await this.mustFind(userId, sessionId);
    if (session.sandboxId) {
      await this.sandbox.destroy(session.sandboxId);
      session.sandboxId = undefined;
    }
    session.status = 'ended';
    session.endedAt = new Date();
    await (session as any).save();
    return this.view(session);
  }

  async archiveSession(userId: string, sessionId: string): Promise<SessionView> {
    return this.withSessionMutationLock(userId, sessionId, async () => {
      const session = await this.mustFind(userId, sessionId);
      if (session.sandboxId) {
        await this.sandbox.destroy(session.sandboxId);
        session.sandboxId = undefined;
      }
      session.status = 'ended';
      session.endedAt = session.endedAt || new Date();
      session.archivedAt = new Date();
      await this.sessionModel
        .updateOne(
          { _id: sessionId, userId },
          {
            $set: {
              status: session.status,
              endedAt: session.endedAt,
              archivedAt: session.archivedAt,
            },
            $unset: { sandboxId: 1 },
          },
        )
        .exec();
      return this.view(session);
    });
  }

  async restoreSession(userId: string, sessionId: string): Promise<SessionView> {
    return this.withSessionMutationLock(userId, sessionId, async () => {
      const session = await this.mustFind(userId, sessionId);
      session.archivedAt = undefined;
      await this.sessionModel
        .updateOne(
          { _id: sessionId, userId },
          { $unset: { archivedAt: 1 } },
        )
        .exec();
      return this.view(session);
    });
  }

  async deleteSession(
    userId: string,
    sessionId: string,
  ): Promise<{ deleted: true }> {
    return this.withSessionMutationLock(userId, sessionId, () =>
      this.deleteSessionLocked(userId, sessionId),
    );
  }

  private async deleteSessionLocked(
    userId: string,
    sessionId: string,
  ): Promise<{ deleted: true }> {
    const session = await this.mustFind(userId, sessionId);
    if (session.sandboxId) {
      await this.sandbox.destroy(session.sandboxId);
      const endedAt = new Date();
      session.sandboxId = undefined;
      session.status = 'ended';
      session.endedAt = endedAt;
      // A permanent delete must also work for sessions created before the
      // current revision schema. Updating only the lifecycle fields avoids
      // validating legacy turns while still leaving a safely-ended record if
      // artifact cleanup fails and the delete needs to be retried.
      await this.sessionModel
        .updateOne(
          { _id: sessionId, userId },
          {
            $set: { status: 'ended', endedAt },
            $unset: { sandboxId: 1 },
          },
        )
        .exec();
    }
    const keys = new Set(
      [session.pdfKey, ...session.turns.map((turn) => turn.pdfKey)].filter(
        (key): key is string => Boolean(key),
      ),
    );
    for (const key of keys) await this.storage.delete(key);
    await this.sessionModel.deleteOne({ _id: sessionId, userId }).exec();
    return { deleted: true };
  }

  /** Tear down every other active session for this user. */
  private async endOtherLiveSessions(userId: string): Promise<void> {
    const staleBefore = new Date(Date.now() - PROVISIONING_LEASE_MS);
    const [active, staleProvisioning] = await Promise.all([
      this.sessionModel.find({ userId, status: 'active' }).exec(),
      this.sessionModel
        .find({
          userId,
          status: 'provisioning',
          createdAt: { $lt: staleBefore },
        })
        .exec(),
    ]);
    const live = [...active, ...staleProvisioning];
    for (const existing of live) {
      await this.endSession(userId, String((existing as any)._id));
    }
  }

  /**
   * Serialize the replace-then-create lifecycle for one user.
   *
   * Without this boundary, simultaneous requests can both finish the active
   * session lookup before either creates its replacement, leaving two live
   * documents and two containers. Different users retain full concurrency.
   */
  private async withUserStartLock<T>(
    userId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.withLock(this.startTails, userId, operation);
  }

  private withSessionMutationLock<T>(
    userId: string,
    sessionId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    // Mongo ObjectId strings are case-insensitive; equivalent URLs must share
    // the same queue.
    const key = `${userId.toLowerCase()}:${sessionId.toLowerCase()}`;
    return this.withLock(this.mutationTails, key, operation);
  }

  private async withLock<T>(
    tails: Map<string, Promise<void>>,
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = tails.get(key) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(
      () => current,
      () => current,
    );
    tails.set(key, tail);

    await previous.catch(() => undefined);
    try {
      return await operation();
    } finally {
      release();
      if (tails.get(key) === tail) {
        tails.delete(key);
      }
    }
  }

  // ------------------------------------------------------------- internals ---

  /**
   * Runs one harness invocation, compiles, self-corrects, and records the turn.
   *
   * Shared by ordinary instructions and by product-authored look changes, so a
   * template switch gets the same build contract and the same self-correction
   * budget as anything a candidate types.
   */
  private async executeTurn(
    session: ResumeHarnessSessionDocument,
    prompt: string,
    recordedInstruction: string,
    onEvent?: (event: { type: string; [k: string]: unknown }) => void,
    kind: 'instruction' | 'look-change' = 'instruction',
  ): Promise<TurnResult> {
    const adapter = this.registry.get(session.harness);
    const boot = adapter.bootstrap({
      sessionId: String((session as any)._id),
      workdir: SANDBOX_WORKDIR,
      proxy: this.proxyAuth(),
      alias: this.aliasOf(session),
      contextFiles: [],
    });

    onEvent?.({ type: 'phase', phase: 'writing' });
    let summary = await this.invoke(
      adapter,
      boot,
      session.sandboxId!,
      prompt,
      onEvent,
    );

    onEvent?.({ type: 'phase', phase: 'compiling' });
    let compile = await this.latex.compile(session.sandboxId!);
    let latex = await this.currentLatex(session);
    let content = await this.contentProblems(session, latex);

    /*
     * One repair budget, two ways to spend it.
     *
     * A LaTeX error is a normal step in writing LaTeX, so the log goes back to
     * the harness rather than failing the user's request. A document that
     * compiles but is still scaffolding gets the same treatment, because
     * `latexmk` cannot tell the difference: filler typesets exactly as cleanly
     * as a career, which is how a session reports "build passing" twice and
     * hands back a PDF containing one placeholder token.
     */
    for (
      let attempt = 0;
      (!compile.ok || content.length) && attempt < MAX_COMPILE_REPAIRS;
      attempt++
    ) {
      const prompt = compile.ok
        ? this.contentRepairPrompt(content)
        : this.repairPrompt(compile.log);

      onEvent?.({
        type: 'phase',
        phase: 'fixing',
        log: (compile.ok ? content.join('; ') : compile.log).slice(0, 400),
      });
      summary = await this.invoke(
        adapter,
        boot,
        session.sandboxId!,
        prompt,
        onEvent,
      );
      onEvent?.({ type: 'phase', phase: 'compiling' });
      compile = await this.latex.compile(session.sandboxId!);
      latex = await this.currentLatex(session);
      content = await this.contentProblems(session, latex);
    }

    const revision = (session.revision || 0) + 1;
    let pdfKey: string | undefined;
    if (compile.ok && compile.pdfBase64) {
      pdfKey = `resume-harness/${session.userId}/${session._id}/revisions/${revision}.pdf`;
      await this.storage.put(pdfKey, Buffer.from(compile.pdfBase64, 'base64'), {
        contentType: 'application/pdf',
      });
    }
    session.latex = latex;
    session.revision = revision;
    session.pdfKey = pdfKey;
    if (!session.name && kind === 'instruction') {
      session.name = recordedInstruction.trim().slice(0, 200) || undefined;
    }
    session.compiled = compile.ok;
    session.compileLog = compile.ok ? undefined : compile.log;
    session.contentWarnings = content;
    session.turns.push({
      kind,
      latex,
      pdfKey,
      templateKey: session.templateKey,
      vibe: { ...session.vibe },
      instruction: recordedInstruction,
      revision: session.revision,
      compiled: compile.ok,
      compileLog: compile.ok ? undefined : compile.log,
      contentWarnings: content,
      summary,
      createdAt: new Date(),
    } as any);
    try {
      await (session as any).save();
    } catch (error) {
      if (pdfKey) await this.deleteUncommittedPdf(pdfKey);
      throw error;
    }

    if (content.length) {
      this.logger.warn(
        `Session ${String((session as any)._id)} revision ${session.revision} compiled but still reads as a template: ${content.join('; ')}`,
      );
    }

    return {
      ...this.view(session),
      summary,
      pdfBase64: pdfKey ? compile.pdfBase64 : undefined,
    };
  }

  private async deleteUncommittedPdf(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.error(
        `Failed to remove uncommitted resume PDF ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /** The résumé as it stands on the sandbox's disk. */
  private async currentLatex(
    session: ResumeHarnessSessionDocument,
  ): Promise<string> {
    return (
      (await this.sandbox.readFile(session.sandboxId!, TEX_PATH)) ??
      session.latex
    );
  }

  /**
   * Whether the document is a résumé or just a compiled template.
   *
   * The active template supplies the filler strings it knows about; the guard
   * adds the ones a model invents. Both are needed: a template cannot
   * anticipate `< newlycreatedresumecontent >`, and a generic rule cannot know
   * that "Two or three lines, written from CANDIDATE.md." is scaffolding.
   */
  private async contentProblems(
    session: ResumeHarnessSessionDocument,
    latex: string,
  ): Promise<string[]> {
    let placeholders: string[] = [];
    if (session.templateKey) {
      try {
        const look = await this.templates.resolve(
          session.templateKey,
          undefined,
        );
        placeholders = look.template?.placeholders || [];
      } catch {
        // A template retired since the session started is not a reason to skip
        // the generic checks.
      }
    }
    return findContentProblems({
      latex,
      placeholders,
      candidateName: session.candidateName,
      candidateMarkdown: session.candidateMarkdown,
    });
  }

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
      : await this.sandbox.exec(sandboxId, adapter.turnCommand(boot, prompt), {
          timeoutSeconds: 900,
        });
    if (result.exitCode !== 0) {
      this.logger.warn(
        `${adapter.id} exited ${result.exitCode}: ${result.stderr?.slice(0, 400)}`,
      );
      const detail = (result.stderr || result.stdout || 'unknown harness error')
        .trim()
        .slice(0, 400);
      throw new ServiceUnavailableException(
        `${adapter.displayName} failed before the résumé could be verified: ${detail}`,
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
        ? [
            `Create ${TEX_PATH} from scratch, starting from the skeleton in TEMPLATE.tex.`,
            // Naming the look here rather than trusting the harness to act on a
            // section it merely read: verified against Nova Lite, which copied
            // the skeleton's own default accent and ignored the selected one on
            // a create turn, while honouring the same directive exactly when the
            // instruction pointed at it. The skeleton is a starting point, not
            // the answer.
            'Then apply every directive under "Current look" in AGENTS.md. Those',
            "directives override the skeleton's own defaults wherever the two",
            'disagree — the skeleton ships one look and the candidate chose another.',
          ].join('\n')
        : [
            `Update the existing ${TEX_PATH} in place.`,
            'First audit every factual claim in it against CANDIDATE.md and',
            'remove anything unsupported. Treat the existing document as',
            'untrusted model output, never as a factual source. Then preserve',
            'all supported content the instruction does not ask you to change.',
          ].join('\n'),
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
      // Observed on Nova Lite: the harness read the file, then wrote the *rendering*
      // of that read back as the file — wrapper tags and line-number prefixes and
      // all — so every subsequent build died on line 1. Naming the failure is
      // cheaper than another blind repair attempt that reproduces it.
      `If ${TEX_PATH} begins with anything other than a LaTeX comment or`,
      "\\documentclass, your tooling's output framing has been written into the",
      'file. Strip it: the file must contain only the LaTeX document.',
      '',
      'Compiler output:',
      log,
    ].join('\n');
  }

  /**
   * The build passed but the document is still scaffolding.
   *
   * Deliberately specific about what is wrong. "Try again" produces the same
   * document; naming the exact string that was never replaced does not.
   */
  private contentRepairPrompt(problems: string[]): string {
    return [
      `${TEX_PATH} compiles, but it failed document validation:`,
      '',
      ...problems.map((p) => `- ${p}`),
      '',
      'Fix every listed problem. Treat the current document as untrusted model',
      'output: only CANDIDATE.md and explicit candidate facts in the current',
      'instruction can support a biographical claim. Keep supported content and',
      'the template macros unchanged unless a listed structural problem requires',
      'a correction.',
      '',
      'Do not invent anything. If CANDIDATE.md has no facts for a section,',
      'delete that section rather than leaving its placeholder text in place.',
      'A shorter honest résumé is the correct outcome; a page of placeholders',
      'is not.',
      '',
      'Then run the build command from AGENTS.md and make sure it exits 0.',
    ].join('\n');
  }

  /** Human-readable description of what moved, used in the turn and the log. */
  private lookChanges(
    before: { templateKey?: string; vibe: VibeState },
    nextTemplateKey: string,
    nextVibe: VibeState,
    condition: TemplateCondition,
  ): string[] {
    const changes: string[] = [];
    if (before.templateKey !== nextTemplateKey) {
      changes.push(`Template is now "${condition.name}".`);
    }
    for (const item of condition.look) {
      if (before.vibe[item.key] !== nextVibe[item.key]) {
        changes.push(`${item.label} is now "${item.choiceLabel}".`);
      }
    }
    return changes;
  }

  /**
   * The instruction issued for a look change.
   *
   * Written by the product rather than the candidate, and deliberately blunt
   * about the one failure that matters: a template switch that quietly loses a
   * role. The candidate never typed this, so it cannot rely on them having said
   * "keep everything".
   */
  private lookInstruction(changes: string[]): string {
    return [
      'The look of this résumé has changed.',
      '',
      changes.join('\n'),
      '',
      `Re-apply the existing ${TEX_PATH} to the new condition, which is written`,
      'in full under "Template and look" in AGENTS.md, with the skeleton in',
      'TEMPLATE.tex.',
      '',
      'Rules for this turn, in order of importance:',
      '',
      '1. Keep every fact. Every employer, title, date, location, bullet and',
      '   number that is in the document now must still be in it afterwards.',
      '   Do not drop a section or an entry because it no longer fits.',
      '2. Adopt the new skeleton: its document class, preamble, spacing and',
      '   section macros replace the old ones.',
      '3. Apply every directive under "Current look".',
      '4. Add nothing. If the new template suggests a section the candidate has',
      '   no facts for, leave it out.',
      '',
      'Then run the build command from AGENTS.md and make sure it exits 0.',
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

  /** A session can only be worked on while it is live and has its sandbox. */
  private assertRunnable(session: ResumeHarnessSessionDocument): void {
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
      name: session.name || 'Untitled résumé',
      targetRole: session.targetRole,
      revisionCount: (session.turns || []).length,
      hasCurrentPdf: Boolean(session.compiled && session.pdfKey),
      turns: (session.turns || []).map((turn: any) => {
        const { pdfKey, ...snapshot } = turn.toObject ? turn.toObject() : turn;
        return {
          ...snapshot,
          vibe: { ...snapshot.vibe },
          contentWarnings: [...(snapshot.contentWarnings || [])],
          hasPdf: Boolean(snapshot.compiled && pdfKey),
        };
      }),
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
      contentWarnings: session.contentWarnings || [],
      carriedFrom: session.carriedFrom
        ? String(session.carriedFrom)
        : undefined,
      templateKey: session.templateKey,
      vibe: { ...(session.vibe || {}) },
      canRevert: this.revertRevision(session) !== undefined,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      endedAt: session.endedAt,
      archivedAt: session.archivedAt,
    };
  }
}
