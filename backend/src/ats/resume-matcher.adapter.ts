import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SandboxService } from '../resume-harness/sandbox/sandbox.service';

export class AtsSandboxReleasedException extends ServiceUnavailableException {
  constructor() {
    super('ATS sandbox was released');
  }
}

function sandboxWasReleased(text: string): boolean {
  const value = String(text || '').toLowerCase();
  return (
    value.includes('no such container') ||
    value.includes('is not running') ||
    value.includes('no such container:') ||
    value.includes('cannot find the container')
  );
}

export interface ResumeMatcherInput {
  sandboxId: string;
  latex: string;
  jobDescription: string;
  sourceRevision: number;
  alias: string;
}

export interface ResumeMatcherResult {
  semanticMatch: number;
  subScores: {
    keywordMatch: number;
    skillsCoverage: number;
    sectionCompleteness: number;
  };
  keywordGaps: string[];
  injectableKeywords: string[];
  suggestions: string[];
}

export abstract class ResumeMatcherAdapter {
  abstract analyze(input: ResumeMatcherInput): Promise<ResumeMatcherResult>;
}

/**
 * Transport-only adapter for the Resume-Matcher runtime baked into the user's
 * existing résumé sandbox. It never provisions or tears down a container and
 * it never recalculates values returned by Resume-Matcher.
 */
@Injectable()
export class InSandboxResumeMatcherAdapter extends ResumeMatcherAdapter {
  constructor(private readonly sandbox: SandboxService) { super(); }

  async analyze(input: ResumeMatcherInput): Promise<ResumeMatcherResult> {
    const path = '.jobocate-ats/input.json';
    try {
      await this.sandbox.writeFiles(input.sandboxId, [{
        path,
        contents: JSON.stringify({
          latex: input.latex,
          jobDescription: input.jobDescription,
          sourceRevision: input.sourceRevision,
          alias: input.alias,
          tags: ['harness=ats'],
        }),
      }]);
    } catch (error) {
      if (sandboxWasReleased(error instanceof Error ? error.message : '')) {
        throw new AtsSandboxReleasedException();
      }
      throw error;
    }

    const executed = await this.sandbox.exec(
      input.sandboxId,
      ['python', '/opt/resume-matcher/jobocate_ats.py', `/workspace/${path}`],
      { timeoutSeconds: 240 },
    );
    if (executed.exitCode !== 0) {
      if (sandboxWasReleased(`${executed.stderr || ''} ${executed.stdout || ''}`)) {
        throw new AtsSandboxReleasedException();
      }
      throw new ServiceUnavailableException('ATS analysis is temporarily unavailable.');
    }

    let output: any;
    try {
      output = JSON.parse(executed.stdout.trim());
    } catch {
      throw new ServiceUnavailableException('ATS analysis returned an invalid response.');
    }

    return {
      semanticMatch: output.overall_score,
      subScores: {
        keywordMatch: output.sub_scores.keyword_match,
        skillsCoverage: output.sub_scores.skills_coverage,
        sectionCompleteness: output.sub_scores.section_completeness,
      },
      keywordGaps: output.missing_keywords,
      injectableKeywords: output.injectable_keywords,
      suggestions: output.recommendations,
    };
  }
}
