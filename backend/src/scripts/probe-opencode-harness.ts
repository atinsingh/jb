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
const passes = Number(valueAfter('--passes') || '1');
if (!Number.isInteger(passes) || passes < 1 || passes > 3) {
  throw new Error('--passes must be an integer from 1 to 3');
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
  const container = `resume-${id}`;
  const outputDir = join(
    process.cwd(),
    '..',
    'tmp',
    'resume-harness-probe',
    id,
  );
  mkdirSync(outputDir, { recursive: true });

  const adapter = new OpenCodeHarness();
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
    contextFiles: context.filesFor('opencode', {
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
      labels: { app: 'jobocate', surface: 'resume-harness-probe' },
    });
    created = true;
    await driver.putFiles(container, boot.files);

    for (let pass = 0; pass < passes; pass++) {
      const run = await driver.exec(
        container,
        adapter.turnCommand(boot, prompts[pass]),
        { cwd: SANDBOX_WORKDIR, timeoutSeconds: 300 },
      );
      if (run.exitCode !== 0) {
        throw new Error(
          `OpenCode pass ${pass + 1} failed: ${run.stderr || run.stdout}`,
        );
      }

      const compile = await driver.exec(
        container,
        ['sh', '-lc', BUILD_COMMAND],
        { cwd: SANDBOX_WORKDIR, timeoutSeconds: 180 },
      );
      const latex = await driver.readFile(container, TEX_PATH);
      if (!latex)
        throw new Error(`pass ${pass + 1} did not create ${TEX_PATH}`);
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
