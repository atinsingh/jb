import { Injectable, Logger } from '@nestjs/common';
import { SandboxService } from '../sandbox/sandbox.service';

/** Paths the harness and the compiler agree on; also stated in AGENTS.md. */
export const TEX_PATH = 'resume.tex';
export const PDF_PATH = 'build/resume.pdf';
export const BUILD_COMMAND =
  'latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build resume.tex';

export interface CompileResult {
  ok: boolean;
  /** Compiler output, trimmed to what is useful to feed back to the harness. */
  log: string;
  /** Base64 PDF when the compile succeeded. */
  pdfBase64: string;
}

/**
 * Compiles the resume inside the session's own sandbox.
 *
 * It runs where the harness runs on purpose: the harness must be able to see
 * and fix its own build errors, and a compiler living elsewhere would only be
 * able to report a failure back to the user.
 *
 * On failure the log is returned rather than thrown. The caller feeds it to the
 * harness for a self-correction turn — a LaTeX error is a normal step in
 * writing LaTeX, not a failed request.
 */
@Injectable()
export class LatexService {
  private readonly logger = new Logger(LatexService.name);

  constructor(private readonly sandbox: SandboxService) {}

  async compile(sandboxId: string): Promise<CompileResult> {
    const result = await this.sandbox.exec(
      sandboxId,
      ['sh', '-lc', BUILD_COMMAND],
      { timeoutSeconds: 180 },
    );

    if (result.exitCode !== 0) {
      return {
        ok: false,
        log: this.relevantErrors(`${result.stdout}\n${result.stderr}`),
        pdfBase64: '',
      };
    }

    const pdfBase64 = await this.sandbox.readFileBase64(sandboxId, PDF_PATH);
    if (!pdfBase64) {
      // latexmk can exit 0 having skipped the build (e.g. nothing to do after a
      // failed earlier run left stale aux files). Treat a missing PDF as a
      // failure so the harness gets a chance to fix it.
      return {
        ok: false,
        log: `${BUILD_COMMAND} exited 0 but ${PDF_PATH} is missing.`,
        pdfBase64: '',
      };
    }

    return { ok: true, log: '', pdfBase64 };
  }

  /**
   * TeX logs are mostly noise. Keep the error lines and their context — that is
   * what a harness can act on, and it keeps the self-correction prompt small.
   */
  private relevantErrors(log: string): string {
    const lines = log.split('\n');
    const kept: string[] = [];
    lines.forEach((line, i) => {
      if (/^!|^l\.\d+|LaTeX Error|Emergency stop|Undefined control sequence/.test(line)) {
        kept.push(...lines.slice(i, i + 4));
      }
    });
    const text = (kept.length ? kept : lines.slice(-40)).join('\n');
    return text.slice(0, 4000);
  }
}
