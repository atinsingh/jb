import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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
import type { ResumeComparisonAnnotation } from './resume-comparison.service';
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
}

export abstract class CandidateResumeReviewAgent {
  abstract review(input: CandidateResumeReviewInput, options?: { forceRefresh?: boolean }): Promise<CandidateResumeReviewResult>;
}

type DetailedReview = {
  atsExplanation: string;
  matchExplanation: string;
  matched: string[];
  missing: string[];
  annotations: ResumeComparisonAnnotation[];
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

  async review(input: CandidateResumeReviewInput, options: { forceRefresh?: boolean } = {}): Promise<CandidateResumeReviewResult> {
    const maxReviewTurns = this.maxReviewTurns();
    const jobDescriptionHash = createHash('sha256').update(input.jobDescription).digest('hex');
    const resumeTextHash = createHash('sha256').update(input.resumeText).digest('hex');
    if (!options.forceRefresh) {
      const completed = await this.sessionModel.findOne({
        userId: input.userId,
        resumeId: input.resumeId,
        jobDescriptionHash,
        resumeTextHash,
        status: 'completed',
      }).sort({ createdAt: -1 }).lean().exec();
      if (completed?.result) return completed.result as CandidateResumeReviewResult;
    }
    const alias = await this.aliases.resolveAutomaticForUser(input.userId);
    const adapter = this.registry.forProvider(alias.provider);
    const session = await this.sessionModel.create({
      userId: input.userId,
      resumeId: input.resumeId,
      jobDescriptionHash,
      resumeTextHash,
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
    const runId = randomUUID();
    let sandboxId: string | undefined;
    const reviewTurns = { count: 0, max: maxReviewTurns };

    try {
      return await this.budget.withCandidateLease(
        input.userId,
        'candidate_ats_review',
        {
          harness: adapter.id,
          alias: alias.alias,
          model: alias.model,
          effort: alias.effort,
          sessionId,
          runId,
        },
        async (access, tags) => {
          const boot = adapter.bootstrap({
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
          if (firstGrounded.length < desired) {
            const repaired = await this.requestReview(
              adapter,
              boot,
              sandboxId,
              `REPAIR REQUIRED: only ${firstGrounded.length} annotations quoted exact text from RESUME.txt. Return the full JSON contract again with at least ${desired} distinct, character-for-character quotes from different résumé lines. Do not paraphrase quote.`,
              reviewTurns,
            );
            detailed = repaired.review;
            session.reviewAttempts = reviewTurns.count;
            annotations = this.mergeGrounded(
              firstGrounded,
              this.grounded(detailed.annotations, input.resumeText),
            );
          }

          if (annotations.length < desired) {
            throw new ServiceUnavailableException(
              `ATS review session produced only ${annotations.length} of ${desired} grounded comments. Retry the comparison; model usage may still have consumed credits.`,
            );
          }

          const result = this.result(sessionId, adapter, alias, ats, detailed, annotations);
          session.status = 'completed';
          session.result = result;
          session.groundedAnnotations = annotations.length;
          session.completedAt = new Date();
          await session.save();
          return result;
        },
      );
    } catch (error) {
      session.status = 'failed';
      session.reviewAttempts = reviewTurns.count;
      const failure = error instanceof Error ? error.message : '';
      session.failureReason = failure.includes('invalid JSON') ? 'INVALID_REVIEW_JSON'
        : failure.includes('grounded comments') ? 'INSUFFICIENT_GROUNDED_COMMENTS'
        : failure.includes('retry limit') ? 'REVIEW_RETRY_LIMIT_EXHAUSTED'
        : failure.includes('returned no review') ? 'EMPTY_HARNESS_REVIEW'
        : failure.includes('review session failed') ? 'HARNESS_EXECUTION_FAILED'
        : 'CANDIDATE_ATS_AGENT_SESSION_FAILED';
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

  private result(
    sessionId: string,
    adapter: HarnessAdapter,
    alias: ResolvedModelAlias,
    ats: ResumeMatcherResult,
    detailed: DetailedReview,
    annotations: ResumeComparisonAnnotation[],
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
        explanation: detailed.atsExplanation,
        findings: ats.suggestions.map((message, index) => ({ code: `AGENT_ATS_${index + 1}`, message })),
      },
      match: {
        coverage: this.score(ats.semanticMatch),
        explanation: detailed.matchExplanation,
        matched: detailed.matched,
        missing,
        keywordCount,
      },
      annotations,
    };
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
      'Return JSON only with: atsExplanation, matchExplanation, matched, missing, annotations.',
      'Read MISSING_SECTIONS.json. Explicitly address absent sections in the ATS explanation; do not fabricate them or quote text that does not exist.',
      'Each annotation needs id, section, severity, message, fix, and an exact consecutive quote copied from RESUME.txt.',
      'Use sections personal, summary, experience, skills, education, projects, achievements, certifications, or languages.',
      'Produce 8-20 useful annotations when enough résumé material exists. Cover different bullets and sections.',
      'AI-written-content detection is outside this session. Do not score it or create AI-detection comments.',
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
    return 'Perform the Compare Resume assessment now. Inspect ORIGINAL_RESUME.pdf or ORIGINAL_RESUME.docx when present, then read RESUME.txt, JOB.txt, and ATS_RESULT.json. Return only the JSON contract from AGENTS.md. Every annotation quote must be copied exactly from RESUME.txt.';
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
          'The prior response was not valid complete JSON for the required review contract. Inspect the original résumé file when present, then read RESUME.txt, JOB.txt and ATS_RESULT.json again. Return one complete compact JSON object only, with atsExplanation, matchExplanation, matched, missing, and annotations. Use short messages and fixes, exact résumé quotes, no markdown or prose outside JSON.',
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
      throw new ServiceUnavailableException(`${adapter.displayName} ATS review session failed.`);
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
    };
  }

  private desiredAnnotationCount(resumeText: string): number {
    const reviewable = resumeText.split(/\r?\n/).filter((line) => line.trim().split(/\s+/).length >= 3).length;
    return Math.max(1, Math.min(8, reviewable));
  }

  private grounded(items: ResumeComparisonAnnotation[], resumeText: string) {
    const haystack = this.comparable(resumeText);
    const sections = new Set(['personal', 'summary', 'experience', 'skills', 'education', 'projects', 'achievements', 'certifications', 'languages']);
    return items.filter((item) => {
      const quote = this.comparable(item.quote || '');
      return sections.has(item.section) && Boolean(item.message?.trim()) && Boolean(item.fix?.trim())
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
