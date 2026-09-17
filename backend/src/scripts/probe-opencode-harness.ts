/**
 * Fast live probe for the production OpenCode résumé path.
 *
 * It deliberately skips HTTP auth, React and browser automation while keeping
 * the pieces that affect model behaviour: the real adapter and config, shared
 * instructions, template, Docker image, LiteLLM route, compiler and content
 * guard.
 *
 * Run:
 *   npm run harness:probe-opencode -- --alias bedrock/qwen3-coder-next/low
 *   npm run harness:probe-opencode -- --alias bedrock/qwen3-coder-next/low --passes 3
 */
import '../load-env';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  ContextFilesService,
  TemplateCondition,
} from '../resume-harness/context-files.service';
import { OpenCodeHarness } from '../resume-harness/harness/opencode.harness';
import { ClaudeCodeHarness } from '../resume-harness/harness/claude-code.harness';
import { CodexHarness } from '../resume-harness/harness/codex.harness';
import { DockerSandboxDriver } from '../resume-harness/sandbox/docker-sandbox.driver';
import { SANDBOX_WORKDIR } from '../resume-harness/sandbox/sandbox.service';
import {
  BUILD_COMMAND,
  PDF_PATH,
  TEX_PATH,
} from '../resume-harness/latex/latex.service';
import { findContentProblems } from '../resume-harness/latex/content-guard';
import { DEFAULT_RESUME_TEMPLATES } from '../resume-harness/templates/resume-templates.seed';

const valueAfter = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};

const alias = valueAfter('--alias') || 'bedrock/qwen3-coder-next/low';
const harness = valueAfter('--harness') || 'opencode';
const questionOnly = process.argv.includes('--question-only');
if (!['opencode', 'claude-code', 'codex'].includes(harness)) {
  throw new Error('--harness must be opencode, claude-code, or codex');
}
const passes = Number(valueAfter('--passes') || '1');
const turnTimeoutSeconds = Number(valueAfter('--timeout-seconds') || '300');
if (!Number.isInteger(passes) || passes < 1 || passes > 3) {
  throw new Error('--passes must be an integer from 1 to 3');
}
if (!Number.isInteger(turnTimeoutSeconds) || turnTimeoutSeconds < 1 || turnTimeoutSeconds > 300) {
  throw new Error('--timeout-seconds must be an integer from 1 to 300');
}

const apiKey =
  process.env.RESUME_HARNESS_LITELLM_KEY || process.env.LITELLM_API_KEY || '';
const baseUrl = (
  process.env.RESUME_HARNESS_LITELLM_INTERNAL_URL ||
  process.env.LITELLM_BASE_URL ||
  'http://jobocate-litellm:4000'
).replace(/\/v1\/?$/, '');
if (!apiKey) throw new Error('RESUME_HARNESS_LITELLM_KEY is not set');

const candidateName = 'Jordan Reyes';
const candidateMarkdown = `# Candidate facts

Everything below is the only source of biographical fact.

## Identity

- Name: ${candidateName}
- Email: jordan.reyes@example.test
- Location: Example City
- LinkedIn: https://example.test/jordan-reyes

## Eligibility

- Sponsorship: not required
- Relocation: not open

## Experience

### Backend Engineer, Example Payments (2022–2025)

- Built a TypeScript payment reconciliation service that processed 2 million transactions each month.
- Reduced reconciliation time from six hours to forty minutes by batching database writes.

## Education

- BSc Computer Science, Example University, 2021.

## Skills

- TypeScript, Node.js, PostgreSQL, Docker, AWS.
`;

const template = DEFAULT_RESUME_TEMPLATES.find(
  (item) => item.key === 'classic-serif',
)!;
const condition: TemplateCondition = {
  key: template.key,
  name: template.name,
  description: template.description,
  skeleton: template.skeleton,
  constraints: template.constraints,
  look: template.knobs.map((knob) => {
    const option = knob.options.find(
      (candidate) => candidate.value === knob.defaultValue,
    )!;
    return {
      key: knob.key,
      label: knob.label,
      choice: option.value,
      choiceLabel: option.label,
      directive: option.directive,
    };
  }),
};

const prompts = [
  'Create a truthful résumé using only CANDIDATE.md. Omit unsupported facts and empty sections.',
  'Audit every claim against CANDIDATE.md, remove anything unsupported, and keep valid LaTeX.',
  'Improve presentation while preserving supported facts exactly. Add no professional characterization.',
];

async function main(): Promise<void> {
  const id = `probe-${randomUUID().slice(0, 12)}`;
  const container = `jb-resume-${id}`;
  const outputDir = join(
    process.cwd(),
    '..',
    'tmp',
    'resume-harness-probe',
    id,
  );
  mkdirSync(outputDir, { recursive: true });

  const adapter = harness === 'claude-code'
    ? new ClaudeCodeHarness()
    : harness === 'codex'
      ? new CodexHarness()
      : new OpenCodeHarness();
  const context = new ContextFilesService();
  const boot = adapter.bootstrap({
    sessionId: id,
    workdir: SANDBOX_WORKDIR,
    proxy: { baseUrl, apiKey },
    alias: {
      alias,
      provider: alias.split('/')[0] || 'unknown',
      model: alias.split('/')[1] || alias,
      effort: alias.split('/')[2] || 'low',
      label: alias,
      maxInputTokens: 128000,
      maxOutputTokens: 8192,
    },
    contextFiles: context.filesFor(adapter.id, {
      workdir: SANDBOX_WORKDIR,
      texPath: TEX_PATH,
      pdfPath: PDF_PATH,
      buildCommand: BUILD_COMMAND,
      candidateMarkdown,
      template: condition,
    }),
  });

  const driver = new DockerSandboxDriver({
    image: process.env.RESUME_SANDBOX_IMAGE || 'jobocate/resume-harness:latest',
    workdir: SANDBOX_WORKDIR,
    ttlSeconds: 600,
    network: process.env.RESUME_SANDBOX_NETWORK,
  });

  const started = Date.now();
  let created = false;
  try {
    await driver.create({
      name: container,
      image:
        process.env.RESUME_SANDBOX_IMAGE || 'jobocate/resume-harness:latest',
      env: boot.env,
      workdir: SANDBOX_WORKDIR,
      ttlSeconds: 600,
      labels: {
        app: 'jobocate',
        namespace: 'jb',
        surface: 'resume-harness-probe',
      },
    });
    created = true;
    const containerMs = Date.now() - started;
    await driver.putFiles(container, boot.files);
    console.log(`setup: container ${containerMs}ms, context ${Date.now() - started - containerMs}ms`);

    for (let pass = 0; pass < passes; pass++) {
      const turnStarted = Date.now();
      let firstEventMs: number | undefined;
      let tokenEvents = 0;
      let actionEvents = 0;
      let streamBuffer = '';
      const run = await driver.execStream(
        container,
        adapter.turnCommand(boot, questionOnly
          ? 'What can you do? Answer directly without creating or editing resume.tex or running the build.'
          : prompts[pass]),
        (chunk) => {
          streamBuffer += chunk;
          const lines = streamBuffer.split(/\r?\n/);
          streamBuffer = lines.pop() || '';
          for (const line of lines) {
            for (const event of adapter.parseStreamEvent?.(line) || []) {
              if (event.type === 'token') tokenEvents++;
              if (event.type === 'activity') actionEvents++;
              if (event.type !== 'error') firstEventMs ??= Date.now() - turnStarted;
            }
          }
        },
        { cwd: SANDBOX_WORKDIR, timeoutSeconds: turnTimeoutSeconds },
      );
      if (streamBuffer.trim()) {
        for (const event of adapter.parseStreamEvent?.(streamBuffer) || []) {
          if (event.type === 'token') tokenEvents++;
          if (event.type === 'activity') actionEvents++;
          if (event.type !== 'error') firstEventMs ??= Date.now() - turnStarted;
        }
      }
      const turnMs = Date.now() - turnStarted;
      console.log(`turn ${pass + 1}: ${turnMs}ms, first output ${firstEventMs ?? 'none'}ms, text events ${tokenEvents}, action events ${actionEvents}`);
      if (run.exitCode !== 0) {
        const parsed = adapter.parseOutput?.(run.stdout);
        const parsedError = parsed?.error;
        throw new Error(
          `${adapter.id} pass ${pass + 1} failed: ${parsedError || run.stderr || run.stdout}; recent actions: ${JSON.stringify(parsed?.activities.slice(-8) || [])}`,
        );
      }

      if (questionOnly) {
        const answer = adapter.parseOutput?.(run.stdout)?.response;
        const latex = await driver.readFile(container, TEX_PATH);
        if (!answer?.trim() || latex) {
          throw new Error(`${adapter.id} informational turn did not answer cleanly without a résumé artifact`);
        }
        console.log(`question: PASS (answer present, no ${TEX_PATH})`);
        continue;
      }

      const compile = await driver.exec(
        container,
        ['sh', '-lc', BUILD_COMMAND],
        { cwd: SANDBOX_WORKDIR, timeoutSeconds: 180 },
      );
      const latex = await driver.readFile(container, TEX_PATH);
      if (!latex)
        throw new Error(`pass ${pass + 1} did not create ${TEX_PATH}; recent actions: ${JSON.stringify(adapter.parseOutput?.(run.stdout)?.activities.slice(-8) || [])}`);
      writeFileSync(join(outputDir, `pass-${pass + 1}.tex`), latex, 'utf8');

      const pdf = await driver.readFileBase64(container, PDF_PATH);
      if (pdf) {
        writeFileSync(
          join(outputDir, `pass-${pass + 1}.pdf`),
          Buffer.from(pdf, 'base64'),
        );
      }
      if (compile.exitCode !== 0) {
        throw new Error(
          `LaTeX pass ${pass + 1} failed: ${compile.stderr || compile.stdout}`,
        );
      }

      const problems = findContentProblems({
        latex,
        placeholders: template.placeholders,
        candidateName,
        candidateMarkdown,
      });
      console.log(
        `pass ${pass + 1}/${passes}: ${problems.length ? `FAIL — ${problems.join('; ')}` : 'PASS'}`,
      );
      if (problems.length) throw new Error('document validation failed');
    }

    console.log(
      `probe passed in ${Math.round((Date.now() - started) / 1000)}s`,
    );
    console.log(`artifacts: ${outputDir}`);
  } finally {
    if (created) await driver.destroy(container);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
