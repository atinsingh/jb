/** Measure the real Resume-Matcher transport inside one Docker sandbox. */
import '../load-env';
import { randomUUID } from 'crypto';
import { InSandboxResumeMatcherAdapter } from '../ats/resume-matcher.adapter';
import { DockerSandboxDriver } from '../resume-harness/sandbox/docker-sandbox.driver';
import { SandboxService, SANDBOX_WORKDIR } from '../resume-harness/sandbox/sandbox.service';

const alias = process.argv[2] || 'bedrock/nova-2-lite/low';
const passes = Number(process.argv[3] || '6');
if (!Number.isInteger(passes) || passes < 1 || passes > 10) {
  throw new Error('Passes must be an integer from 1 to 10');
}

const apiKey = process.env.RESUME_HARNESS_LITELLM_KEY || process.env.LITELLM_API_KEY;
if (!apiKey) throw new Error('A LiteLLM key is required');
const baseUrl = (
  process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL ||
  process.env.LITELLM_BASE_URL ||
  'http://jobocate-litellm:4000'
).replace(/\/v1\/?$/, '');
const driver = new DockerSandboxDriver({
  image: process.env.RESUME_SANDBOX_IMAGE || 'jobocate/resume-harness:latest',
  workdir: SANDBOX_WORKDIR,
  ttlSeconds: 600,
  network: process.env.RESUME_SANDBOX_NETWORK,
});
const sandbox = new SandboxService(driver);
const matcher = new InSandboxResumeMatcherAdapter(sandbox);
const sessionId = `ats-probe-${randomUUID().slice(0, 12)}`;
const latex = String.raw`\documentclass{article}
\begin{document}
\section*{Jordan Reyes}
Backend Engineer | jordan.reyes@example.test
\section*{Experience}
Backend Engineer, Example Payments, 2022--2025.
Built a TypeScript payment reconciliation service processing two million transactions monthly.
Reduced reconciliation time from six hours to forty minutes using batched PostgreSQL writes.
\section*{Skills}
TypeScript, Node.js, PostgreSQL, Docker, AWS.
\section*{Education}
BSc Computer Science, Example University, 2021.
\end{document}`;
const jobDescription = 'Backend engineer required: TypeScript, Node.js, PostgreSQL, Docker, AWS, payment systems, APIs, and cloud deployment.';

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * fraction) - 1];
}

async function main(): Promise<void> {
  let sandboxId: string | undefined;
  const provisionStart = Date.now();
  try {
    const created = await sandbox.provision({
      sessionId,
      harness: 'ats',
      env: {
        JOBOCATE_LITELLM_BASE_URL: baseUrl,
        JOBOCATE_LITELLM_API_KEY: apiKey!,
      },
      files: [],
    });
    sandboxId = created.sandboxId;
    console.log(`ATS provision: ${Date.now() - provisionStart}ms`);
    const samples: number[] = [];
    for (let pass = 1; pass <= passes; pass++) {
      const start = Date.now();
      const result = await matcher.analyze({
        sandboxId,
        latex,
        jobDescription,
        sourceRevision: 1,
        alias,
      });
      const elapsed = Date.now() - start;
      samples.push(elapsed);
      if (!Number.isFinite(result.semanticMatch)) throw new Error('ATS score missing');
      console.log(`ATS pass ${pass}: ${elapsed}ms; score ${result.semanticMatch}; gaps ${result.keywordGaps.length}`);
    }
    console.log(`ATS warm p50 ${percentile(samples.slice(1), 0.5) || 0}ms; p95 ${percentile(samples.slice(1), 0.95) || 0}ms (${samples.length - 1} warm samples)`);
  } finally {
    if (sandboxId) await sandbox.destroy(sandboxId);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
