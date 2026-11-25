import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { AiBudgetService } from '../ai-budget/ai-budget.service';
import { ResumeMatcherAdapter, ResumeMatcherResult } from '../ats/resume-matcher.adapter';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { HarnessRegistry } from '../resume-harness/harness/harness.registry';
import { HarnessAdapter, HarnessContextFile, ResolvedModelAlias } from '../resume-harness/harness/harness.types';
import { ModelAliasService } from '../resume-harness/model-alias.service';
import { SANDBOX_WORKDIR, SandboxService } from '../resume-harness/sandbox/sandbox.service';
import { hideWorkspaceFiles, WORKSPACE_VOICE_RULE } from '../resume-harness/workspace-voice';
import type { ResumeComparisonAnnotation } from './resume-comparison.service';
import { absentAfterExtraction, ExtractedResume, groundResumeExtraction, mergeExtractedResumes } from './resume-extraction';
import {
  CandidateAtsReviewSession,
  CandidateAtsReviewSessionDocument,
} from './schemas/candidate-ats-review-session.schema';

export interface CandidateResumeReviewInput {
  userId: string;
  resumeId: string;
  resumeText: string;
  jobDescription: string;
  missingSections?: string[];
  originalFile?: { filename: string; bytes: Buffer };
}

export interface CandidateResumeReviewResult {
  source: 'agent-session';
  sessionId: string;
  harness: string;
  modelAlias: string;
  ats: { score: number; explanation?: string; findings: Array<Record<string, unknown>> };
  match: {
    coverage: number;
    explanation?: string;
    matched: string[];
    missing: string[];
    keywordCount: number;
  };
  annotations: ResumeComparisonAnnotation[];
  extracted?: ExtractedResume;
  absentSections?: string[];
}

export type BeginCandidateResumeReview =
  | { pending: false; result: CandidateResumeReviewResult }
  | { pending: true; sessionId: string };

export abstract class CandidateResumeReviewAgent {
  abstract review(input: CandidateResumeReviewInput, options?: { forceRefresh?: boolean }): Promise<CandidateResumeReviewResult>;
  abstract beginReview(input: CandidateResumeReviewInput, options?: { forceRefresh?: boolean; onComplete?: (result: CandidateResumeReviewResult) => void }): Promise<BeginCandidateResumeReview>;
}

type DetailedReview = {
  atsExplanation: string;
  matchExplanation: string;
  matched: string[];
  missing: string[];
  annotations: ResumeComparisonAnnotation[];
  extracted?: unknown;
  absentSections: string[];
};


/**
 * Candidate Compare Resume runtime.
 *
 * This is deliberately a real harness session, not an SDK chat completion:
 * one persisted logical session owns one sandbox, Resume-Matcher runs inside
 * that sandbox, and the selected candidate harness performs the quoted review
 * there before the sandbox is released.
 */
@Injectable()
export class LiteLlmCandidateResumeReviewAgent extends CandidateResumeReviewAgent {
  private readonly logger = new Logger(LiteLlmCandidateResumeReviewAgent.name);

  constructor(
    @InjectModel(CandidateAtsReviewSession.name)
    private readonly sessionModel: Model<CandidateAtsReviewSessionDocument>,
    private readonly aliases: ModelAliasService,
    private readonly budget: AiBudgetService,
    private readonly quota: LLMQuotaService,
    private readonly registry: HarnessRegistry,
    private readonly sandbox: SandboxService,
    private readonly matcher: ResumeMatcherAdapter,
  ) {
    super();
  }

  private async reusableReview(input: CandidateResumeReviewInput, forceRefresh: boolean) {
    if (forceRefresh) return null;
    const jobDescriptionHash = createHash('sha256').update(input.jobDescription).digest('hex');
    const resumeTextHash = createHash('sha256').update(input.resumeText).digest('hex');
    const completed = await this.sessionModel.findOne({
      userId: input.userId,
      resumeId: input.resumeId,
      status: 'completed',
      jobDescriptionHash,
      resumeTextHash,
    }).sort({ createdAt: -1 }).lean().exec();
    if (completed?.result) return { kind: 'cached' as const, result: completed.result as CandidateResumeReviewResult };
    const inflight = await this.sessionModel.find({
      userId: input.userId,
      resumeId: input.resumeId,
      status: { $in: ['provisioning', 'active'] },
    }).exec();
    const same = inflight.find((row) => row.jobDescriptionHash === jobDescriptionHash && row.resumeTextHash === resumeTextHash);
    return same ? { kind: 'inflight' as const, sessionId: String(same._id) } : null;
  }

  async beginReview(
    input: CandidateResumeReviewInput,
    options: { forceRefresh?: boolean; onComplete?: (result: CandidateResumeReviewResult) => void } = {},
  ): Promise<BeginCandidateResumeReview> {
    const reusable = await this.reusableReview(input, options.forceRefresh === true);
    if (reusable?.kind === 'cached') return { pending: false, result: reusable.result };
    if (reusable?.kind === 'inflight') return { pending: true, sessionId: reusable.sessionId };
    return await new Promise((resolve, reject) => {
      let settled = false;
      void this.review(input, {
        forceRefresh: options.forceRefresh,
        ready: (sessionId) => {
          settled = true;
          resolve({ pending: true, sessionId });
        },
      }).then((result) => {
        // A review that finished before ready() is returned to the caller directly.
        if (!settled) {
          resolve({ pending: false, result });
          return;
        }
        try {
          void Promise.resolve(options.onComplete?.(result)).catch(() => undefined);
        } catch { /* a failing callback must not turn the finished review into an unhandled rejection */ }
      }).catch((error) => {
        if (!settled) reject(error);
      });
    });
  }

  async review(input: CandidateResumeReviewInput, options: { forceRefresh?: boolean; ready?: (sessionId: string) => void } = {}): Promise<CandidateResumeReviewResult> {
    const maxReviewTurns = this.maxReviewTurns();
    const jobDescriptionHash = createHash('sha256').update(input.jobDescription).digest('hex');
    const resumeTextHash = createHash('sha256').update(input.resumeText).digest('hex');
    if (!options.forceRefresh) {
      const completed = await this.sessionModel.findOne({
        userId: input.userId,
        resumeId: input.resumeId,
        status: 'completed',
        jobDescriptionHash,
        resumeTextHash,
      }).sort({ createdAt: -1 }).lean().exec();
      if (completed?.result) return completed.result as CandidateResumeReviewResult;
    }
    const inflight = await this.sessionModel.find({
      userId: input.userId,
      resumeId: input.resumeId,
      status: { $in: ['provisioning', 'active'] },
    }).exec();
    const sameJob = options.forceRefresh ? undefined : inflight.find((row) =>
      row.jobDescriptionHash === jobDescriptionHash && row.resumeTextHash === resumeTextHash);
    if (sameJob) {
      const joined = await this.waitForReview(sameJob._id);
      if (joined) return joined;
    }
    const replaced = inflight.filter((row) => row !== sameJob);
    for (const row of replaced) {
      row.status = 'failed';
      row.failureReason = 'SUPERSEDED';
      await row.save();
      if (row.sandboxId) {
        try { await this.sandbox.destroy(row.sandboxId); } catch { /* the running review observes SUPERSEDED */ }
      }
    }
    const alias = await this.aliases.resolveAutomaticForUser(input.userId);
    const adapter = this.registry.forProvider(alias.provider);
    const session = await this.sessionModel.create({
      userId: input.userId,
      resumeId: input.resumeId,
      jobDescriptionHash,
      resumeTextHash,
      jobText: input.jobDescription,
      harness: adapter.id,
      alias: alias.alias,
      provider: alias.provider,
      model: alias.model,
      effort: alias.effort,
      status: 'provisioning',
      reviewAttempts: 0,
      groundedAnnotations: 0,
    });
    const sessionId = String(session._id);
    options.ready?.(sessionId);
    const runId = randomUUID();
    let sandboxId: string | undefined;
    const reviewTurns = { count: 0, max: maxReviewTurns };

    try {
      return await this.withReviewLease(
        input.userId,
        {
          harness: adapter.id,
          alias: alias.alias,
          model: alias.model,
          effort: alias.effort,
          sessionId,
          runId,
        },
        async (access, tags) => {
          await this.stopIfReplaced(sessionId);
          const boot = adapter.bootstrap({
            purpose: 'resume-review',
            sessionId,
            workdir: SANDBOX_WORKDIR,
            proxy: this.candidateProxy(access.apiKey),
            alias,
            requestTags: tags,
            contextFiles: this.reviewFiles(input),
          });
          const proxy = this.candidateProxy(access.apiKey);
          boot.env.JOBOCATE_LITELLM_BASE_URL = proxy.baseUrl;
          boot.env.JOBOCATE_LITELLM_API_KEY = proxy.apiKey;
          const provisioned = await this.sandbox.provision({
            sessionId,
            harness: adapter.id,
            env: boot.env,
            files: boot.files,
          });
          sandboxId = provisioned.sandboxId;
          session.sandboxId = sandboxId;
          session.status = 'active';
          await session.save();

          const ats = await this.matcher.analyze({
            sandboxId,
            latex: input.resumeText,
            jobDescription: input.jobDescription,
            sourceRevision: 1,
            alias: alias.alias,
            tags,
            apiKey: access.apiKey,
          });
          if (ats.subScores.sectionCompleteness <= 0 &&
            /^\s*(summary|professional summary)\s*$/im.test(input.resumeText) &&
            /^\s*(experience|work experience|professional experience)\s*$/im.test(input.resumeText)) {
            throw new ServiceUnavailableException(
              'ATS section assessment contradicts the original résumé: professional sections are present. The comparison was not saved.',
            );
          }
          await this.sandbox.writeFiles(sandboxId, [{
            path: 'ATS_RESULT.json',
            contents: JSON.stringify(ats, null, 2),
          }]);

          const first = await this.requestReview(adapter, boot, sandboxId, this.reviewPrompt(), reviewTurns);
          session.reviewAttempts = reviewTurns.count;
          const desired = this.desiredAnnotationCount(input.resumeText);
          const firstGrounded = this.grounded(first.review.annotations, input.resumeText);
          let detailed = first.review;
          let annotations = firstGrounded;
          let extracted = groundResumeExtraction(first.review.extracted, input.resumeText);
          let absentSections = first.review.absentSections;
          const expectsExtraction = Boolean(input.originalFile) && input.resumeText.split(/\r?\n/).filter((line) => line.trim()).length >= 3;
          let requestedExtractionRepair = false;

          while (
            reviewTurns.count < reviewTurns.max
            && (annotations.length < desired || (expectsExtraction && !Object.keys(extracted).length && !requestedExtractionRepair))
          ) {
            const needsAnnotations = annotations.length < desired;
            if (!needsAnnotations) requestedExtractionRepair = true;
            const repairPrompt = needsAnnotations
              ? `REPAIR REQUIRED: only ${annotations.length} annotations had exact source quotes and factual fixes. Return the full JSON contract again with at least ${desired} distinct, character-for-character quotes from different résumé lines, plus extracted and absentSections. Do not paraphrase quotes or invent metrics in fixes. Ask for missing facts without supplying fictional examples.`
              : `REPAIR REQUIRED: extracted was missing or empty. Return the full JSON contract again with extracted populated verbatim from the original résumé (including canonical sections and customSections for any other headings) and absentSections. Keep your exact grounded annotations.`;
            const repaired = await this.requestReview(
              adapter,
              boot,
              sandboxId,
              repairPrompt,
              reviewTurns,
            );
            extracted = mergeExtractedResumes(
              extracted,
              groundResumeExtraction(repaired.review.extracted, input.resumeText),
            );
            if (repaired.review.absentSections.length) {
              absentSections = repaired.review.absentSections;
            }
            detailed = repaired.review;
            session.reviewAttempts = reviewTurns.count;
            annotations = this.mergeGrounded(
              annotations,
              this.grounded(detailed.annotations, input.resumeText),
            );
          }

          if (annotations.length < desired) {
            throw new ServiceUnavailableException(
              `ATS review session produced only ${annotations.length} of ${desired} grounded comments after its ${reviewTurns.max}-turn retry limit. Retry the comparison; model usage may still have consumed credits.`,
            );
          }

          const result = this.result(
            sessionId, adapter, alias, ats, detailed, annotations,
            extracted, absentAfterExtraction(absentSections, extracted),
          );
          session.status = 'completed';
          session.result = result;
          session.groundedAnnotations = annotations.length;
          session.completedAt = new Date();
          await session.save();
          return result;
        },
      );
    } catch (error) {
      if ((error as any)?.code === 'AI_USAGE_RECONCILING' && session.status === 'completed' && session.result) {
        return session.result as CandidateResumeReviewResult;
      }
      session.status = 'failed';
      session.reviewAttempts = reviewTurns.count;
      const failure = error instanceof Error ? error.message : '';
      session.failureReason = failure.includes('invalid JSON') ? 'INVALID_REVIEW_JSON'
        : failure.includes('retry limit') ? 'REVIEW_RETRY_LIMIT_EXHAUSTED'
        : failure.includes('grounded comments') ? 'INSUFFICIENT_GROUNDED_COMMENTS'
        : failure.includes('returned no review') ? 'EMPTY_HARNESS_REVIEW'
        : failure.includes('review session failed') ? 'HARNESS_EXECUTION_FAILED'
        : 'CANDIDATE_ATS_AGENT_SESSION_FAILED';
      const detail = this.failureDetail(error);
      session.failureDetail = detail;
      this.logger.warn(`Compare review ${sessionId} failed (${session.failureReason}) after ${reviewTurns.count} review turn(s): ${detail}`);
      try { await session.save(); } catch { /* preserve the execution error */ }
      throw error;
    } finally {
      if (sandboxId) {
        try { await this.sandbox.destroy(sandboxId); } catch { /* TTL remains the cleanup backstop */ }
        session.sandboxId = undefined;
        try { await session.save(); } catch { /* terminal result already decided */ }
      }
    }
  }

  /** Error class, optional HTTP error code, and message; no résumé or job text. */
  private failureDetail(error: unknown): string {
    let text = String(error);
    if (error instanceof Error) {
      const response = error instanceof HttpException ? error.getResponse() : undefined;
      const code = response && typeof response === 'object' && 'code' in response ? (response as { code?: unknown }).code : undefined;
      const label = code ? `${error.constructor.name}[${String(code)}]` : error.constructor.name;
      const diagnostic = (error as { diagnostic?: unknown }).diagnostic;
      text = `${label}: ${error.message}${typeof diagnostic === 'string' ? ` (${diagnostic})` : ''}`;
    }
    return text
      .replace(/\s+/g, ' ')
      .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-[redacted]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
      .trim()
      .slice(0, 500);
  }

  private result(
    sessionId: string,
    adapter: HarnessAdapter,
    alias: ResolvedModelAlias,
    ats: ResumeMatcherResult,
    detailed: DetailedReview,
    annotations: ResumeComparisonAnnotation[],
    extracted: ExtractedResume,
    absentSections: string[],
  ): CandidateResumeReviewResult {
    const missing = detailed.missing.length ? detailed.missing : ats.keywordGaps;
    const keywordCount = new Set([...detailed.matched, ...missing].map((item) => item.toLowerCase())).size;
    return {
      source: 'agent-session',
      sessionId,
      harness: adapter.id,
      modelAlias: alias.alias,
      ats: {
        score: this.score(ats.subScores.sectionCompleteness),
        explanation: hideWorkspaceFiles(detailed.atsExplanation),
        findings: ats.suggestions.map((message, index) => ({ code: `AGENT_ATS_${index + 1}`, message: hideWorkspaceFiles(message) })),
      },
      match: {
        coverage: this.score(ats.semanticMatch),
        explanation: hideWorkspaceFiles(detailed.matchExplanation),
        matched: detailed.matched,
        missing,
        keywordCount,
      },
      annotations: annotations.map((annotation, index) => ({
        ...annotation,
        id: `agent-${index + 1}`,
        message: hideWorkspaceFiles(annotation.message),
        fix: hideWorkspaceFiles(annotation.fix),
      })),
      ...(Object.keys(extracted).length ? { extracted } : {}),
      ...(absentSections.length ? { absentSections } : {}),
    };
  }

  private async waitForReview(id: unknown): Promise<CandidateResumeReviewResult | null> {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const current = await this.sessionModel.findOne({ _id: id }).sort({ createdAt: -1 }).lean().exec();
      if (current?.status === 'completed' && current.result) return current.result as CandidateResumeReviewResult;
      if (!current || current.status === 'failed' || current.failureReason === 'SUPERSEDED') return null;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return null;
  }

  private async stopIfReplaced(id: string) {
    const current = await this.sessionModel.findOne({ _id: id }).sort({ createdAt: -1 }).lean().exec();
    if (current?.failureReason === 'SUPERSEDED') {
      throw new ServiceUnavailableException('This comparison was replaced by a newer job.');
    }
  }

  private withReviewLease<T>(
    userId: string,
    attribution: { harness: string; alias: string; model: string; effort: string; sessionId: string; runId: string },
    run: Parameters<AiBudgetService['withCandidateLease']>[3],
  ): Promise<T> {
    const start = () => this.budget.withCandidateLease(userId, 'candidate_ats_review', attribution, run) as Promise<T>;
    const claim = async (attempt: number): Promise<T> => {
      try {
        return await start();
      } catch (error) {
        if (attempt >= 40 || (error as { code?: string }).code !== 'AI_BUDGET_OPERATION_IN_PROGRESS') throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return claim(attempt + 1);
      }
    };
    return claim(0);
  }

  private reviewFiles(input: CandidateResumeReviewInput): HarnessContextFile[] {
    const extension = input.originalFile?.filename.toLowerCase().match(/\.(pdf|docx)$/)?.[0];
    const sourcePath = extension ? `ORIGINAL_RESUME${extension}` : undefined;
    const rules = [
      '# Compare Resume review session',
      'This is a read-only résumé assessment. Never edit files or invent candidate facts.',
      sourcePath
        ? `Inspect ${sourcePath} directly in this workspace, then read RESUME.txt, JOB.txt, and ATS_RESULT.json. For PDF, use Python pdfminer.high_level.extract_text; for DOCX, use python-docx. The original file is authoritative; RESUME.txt is an extraction aid for exact quotes and highlights.`
        : 'Read RESUME.txt, JOB.txt, and ATS_RESULT.json before answering.',
      'Return JSON only with: atsExplanation, matchExplanation, matched, missing, annotations, extracted, absentSections.',
      'extracted schema: { fullName, email, phone, location, linkedin, github, website, headline, summary, skills: string[], experience: [{ title, company, location, startDate, endDate, current, description, achievements: string[] }], education: [{ degree, institution, location, startDate, endDate, gpa, description }], achievements: string[], certifications: [{ name, issuer, date }], projects: [{ name, description, technologies: string[], url, startDate, endDate }], languages: [{ language, proficiency }], customSections: [{ heading, items: string[] }] }. Copy consecutive source text only. Do not paraphrase, improve, or add employers, dates, metrics, or skills.',
      'Equate headings by meaning. Engineering Description, professional profile, objective, and about are summary. Work history, career history, and employment are experience. Technical stack and core competencies are skills. Academic background is education. Preserve any additional non-standard sections (such as Publications, Open Source, Volunteer, Speaking, Patents, Leadership, or Coursework) verbatim in customSections using their original heading.',
      'MISSING_SECTIONS.json lists canonical sections already known to have no content. It is empty when the original file must be read. Do not treat an unfamiliar heading as a missing summary.',
      'absentSections lists canonical sections that have no equivalent heading and no body. Omit a section whose text is in extracted.',
      'Each annotation needs id, section, severity, message, fix, and an exact consecutive quote copied from RESUME.txt.',
      'Every suggested rewrite must use only facts already present in RESUME.txt. Never invent metrics, dates, customers, achievements, qualifications, tools or technologies, even as examples. Do not add a missing job keyword as a candidate skill. Ask the candidate to add evidence only if it is true; otherwise suggest learning it separately. Do not infer a current employer or school location from contact details.',
      'Do not provide sample replacement bullets, fictional examples, or fill-in-the-blank placeholders such as X%, X team, or [result]. Instead, ask a concise specific question for the missing factual detail or suggest a factual formatting improvement.',
      'Do not put proposed candidate claims in quotation marks. Quoted phrases in a fix must already appear verbatim in RESUME.txt. For missing collaboration evidence, ask what collaboration actually occurred; never supply a code-review, mentoring, or leadership achievement.',
      'Do not calculate new ratios, percentages, or metrics in messages or fixes. Cite the original measurements only. JOB.txt is the authority for requirements: never describe an inferred ATS keyword as a job requirement unless JOB.txt actually states it.',
      'A closed employment date range is not current employment. Do not call a role current unless the source explicitly says Present or Current.',
      'Use sections personal, summary, experience, skills, education, projects, achievements, certifications, or languages.',
      `Produce ${this.desiredAnnotationCount(input.resumeText)}-${Math.max(10, this.desiredAnnotationCount(input.resumeText))} useful annotations. Cover different bullets and sections; do not repeat the same issue.`,
      'Keep each explanation under 80 words, each annotation message under 35 words, and each fix under 45 words. Quote only the shortest consecutive source passage that identifies the issue. Return compact JSON without a reasoning narrative. Read the required context together where practical; do not repeatedly read unchanged files.',
      'Writing-style detection is outside this session. Do not score writing style or comment on whether the text sounds generated.',
      WORKSPACE_VOICE_RULE,
    ].join('\n');
    const files: HarnessContextFile[] = [
      { path: 'AGENTS.md', contents: `${rules}\n` },
      { path: 'CLAUDE.md', contents: '@AGENTS.md\n' },
      { path: 'RESUME.txt', contents: input.resumeText },
      { path: 'JOB.txt', contents: input.jobDescription },
      { path: 'MISSING_SECTIONS.json', contents: JSON.stringify(input.missingSections || []) },
    ];
    if (sourcePath) files.push({ path: sourcePath, bytes: input.originalFile!.bytes });
    return files;
  }

  private reviewPrompt(): string {
    return `Perform the Compare Resume assessment now. Inspect ORIGINAL_RESUME.pdf or ORIGINAL_RESUME.docx when present, then read RESUME.txt, JOB.txt, and ATS_RESULT.json. Return only the JSON contract from AGENTS.md, including extracted and absentSections. Equate headings such as Engineering Description to summary and copy that text verbatim. Every annotation quote must be copied exactly from RESUME.txt. ${WORKSPACE_VOICE_RULE}`;
  }

  private async requestReview(
    adapter: HarnessAdapter,
    boot: ReturnType<HarnessAdapter['bootstrap']>,
    sandboxId: string,
    prompt: string,
    turns: { count: number; max: number },
  ): Promise<{ review: DetailedReview; attempts: number }> {
    let response = await this.invokeReviewTurn(adapter, boot, sandboxId, prompt, turns);
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return { review: this.parseReview(response), attempts: attempt };
      } catch (error) {
        if (!(error instanceof ServiceUnavailableException) || attempt === 2) throw error;
        response = await this.invokeReviewTurn(
          adapter,
          boot,
          sandboxId,
          `The prior response was not valid complete JSON for the required review contract. Inspect the original résumé file when present, then read RESUME.txt, JOB.txt and ATS_RESULT.json again. Return one complete compact JSON object only, with atsExplanation, matchExplanation, matched, missing, annotations, extracted, and absentSections. Equate headings such as Engineering Description to summary and copy that text verbatim. Use short messages and fixes, exact résumé quotes, no markdown or prose outside JSON. ${WORKSPACE_VOICE_RULE}`,
          turns,
        );
      }
    }
    throw new ServiceUnavailableException('ATS review session returned invalid JSON.');
  }

  private async invokeReviewTurn(
    adapter: HarnessAdapter,
    boot: ReturnType<HarnessAdapter['bootstrap']>,
    sandboxId: string,
    prompt: string,
    turns: { count: number; max: number },
  ): Promise<string> {
    if (turns.count >= turns.max) {
      throw new ServiceUnavailableException(
        `ATS review session reached its ${turns.max}-turn retry limit. Model usage may have consumed credits. Retry the comparison.`,
      );
    }
    turns.count += 1;
    return this.invoke(adapter, boot, sandboxId, prompt);
  }

  private maxReviewTurns(): number {
    const raw = process.env.CANDIDATE_ATS_MAX_REVIEW_TURNS;
    const value = Number(raw);
    if (!raw || !Number.isInteger(value) || value < 1 || value > 5) {
      throw new ServiceUnavailableException(
        'Invalid ATS retry configuration: CANDIDATE_ATS_MAX_REVIEW_TURNS must be an integer from 1 to 5.',
      );
    }
    return value;
  }

  private async invoke(
    adapter: HarnessAdapter,
    boot: ReturnType<HarnessAdapter['bootstrap']>,
    sandboxId: string,
    prompt: string,
  ): Promise<string> {
    const executed = await this.sandbox.exec(
      sandboxId,
      adapter.turnCommand(boot, prompt),
      { timeoutSeconds: 240, env: boot.env },
    );
    const parsed = adapter.parseOutput?.(executed.stdout || '');
    if (executed.exitCode !== 0 || parsed?.error) {
      // The diagnostic tells a timeout from a crash without saving raw harness output.
      const timedOut = /timed out|timeout/i.test(`${executed.stderr || ''} ${parsed?.error || ''}`) ? ' (timed out)' : '';
      throw Object.assign(new ServiceUnavailableException(`${adapter.displayName} ATS review session failed.`), {
        diagnostic: executed.exitCode !== 0 ? `${adapter.id} exited ${executed.exitCode}${timedOut}` : `${adapter.id} reported a review error${timedOut}`,
      });
    }
    // A structured harness stream without a final assistant result is not a
    // textual review; parsing the stream envelope would mislabel this failure.
    const response = adapter.parseOutput ? parsed?.response : executed.stdout;
    if (!response?.trim()) {
      throw new ServiceUnavailableException(`${adapter.displayName} ATS review session returned no review.`);
    }
    return response.trim();
  }

  private parseReview(raw: string): DetailedReview {
    let value: any;
    for (let start = raw.indexOf('{'); start >= 0; start = raw.indexOf('{', start + 1)) {
      for (let end = raw.lastIndexOf('}'); end > start; end = raw.lastIndexOf('}', end - 1)) {
        try {
          const candidate = JSON.parse(raw.slice(start, end + 1));
          if (candidate && typeof candidate === 'object' && Array.isArray(candidate.annotations)) {
            value = candidate;
            break;
          }
        } catch { /* the wrapper may contain other braces */ }
      }
      if (value) break;
    }
    if (!value) {
      throw new ServiceUnavailableException('ATS review session returned invalid JSON.');
    }
    return {
      atsExplanation: this.text(value.atsExplanation),
      matchExplanation: this.text(value.matchExplanation),
      matched: this.strings(value.matched),
      missing: this.strings(value.missing),
      annotations: value.annotations.map((item: any, index: number) => ({
        id: this.text(item.id) || `agent-${index + 1}`,
        section: item.section,
        severity: item.severity,
        color: item.color,
        message: this.text(item.message),
        fix: this.text(item.fix),
        quote: this.text(item.quote),
      })),
      extracted: value.extracted && typeof value.extracted === 'object' ? value.extracted : undefined,
      absentSections: this.strings(value.absentSections),
    };
  }

  private desiredAnnotationCount(resumeText: string): number {
    const reviewable = resumeText.split(/\r?\n/).filter((line) =>
      !/\S+@\S+|https?:\/\/|(?:linkedin|github)\.com\//i.test(line)
      && line.trim().split(/\s+/).length >= 3,
    ).length;
    return Math.max(1, Math.min(8, reviewable));
  }

  private grounded(items: ResumeComparisonAnnotation[], resumeText: string) {
    const haystack = this.comparable(resumeText);
    const sourceNumbers = new Set(resumeText.match(/\d+(?:[.,]\d+)*/g) || []);
    const sections = new Set(['personal', 'summary', 'experience', 'skills', 'education', 'projects', 'achievements', 'certifications', 'languages']);
    return items.filter((item) => {
      const quote = this.comparable(item.quote || '');
      const proposedClaims = [...item.fix.matchAll(/["'“‘]([^"'”’\n]{12,})["'”’]/g)]
        .map(match => match[1]).filter(claim => claim.trim().split(/\s+/).length >= 4);
      return sections.has(item.section) && Boolean(item.message?.trim()) && Boolean(item.fix?.trim())
        && (!/currently employed|current (?:role|employer|employment)/i.test(`${item.message} ${item.fix}`)
          || /\b(?:present|current|now)\b/i.test(resumeText))
        && proposedClaims.every(claim => haystack.includes(this.comparable(claim)))
        && !/\bX(?:%|\s+(?:team|customers|users|percent))|\[[^\]]+\]|\be\.g\.|\bexample\s*:/i.test(item.fix)
        && (`${item.message} ${item.fix}`.match(/\d+(?:[.,]\d+)*/g) || []).every(number => sourceNumbers.has(number))
        && quote.length >= 4 && haystack.includes(quote);
    });
  }

  private mergeGrounded(first: ResumeComparisonAnnotation[], second: ResumeComparisonAnnotation[]) {
    const seen = new Set<string>();
    return [...first, ...second].filter((item) => {
      const key = `${item.section}:${this.comparable(item.quote || '')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private candidateProxy(apiKey: string) {
    const baseUrl = process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL || process.env.LITELLM_BASE_URL || 'http://localhost:4000';
    return { baseUrl: baseUrl.replace(/\/v1\/?$/, ''), apiKey };
  }

  private score(value: unknown): number {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private strings(value: unknown): string[] {
    return Array.isArray(value) ? value.map((item) => this.text(item)).filter(Boolean) : [];
  }

  private comparable(value: string): string {
    return String(value || '').normalize('NFKD').toLowerCase()
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
  }
}
