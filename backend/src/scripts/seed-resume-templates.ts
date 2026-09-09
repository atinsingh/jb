/**
 * Seeds the predefined LaTeX résumé template catalogue.
 *
 * Templates are data, not code: the résumé harness never branches on a template
 * key, so adding or editing one is an entry in
 * `src/resume-harness/templates/resume-templates.seed.ts` plus a re-run of this
 * script — no deploy, which is the acceptance criterion JOB-99 is checking.
 *
 * Idempotent: it upserts on `key` and rewrites the whole body, so running it
 * twice leaves exactly one of each, and running it after editing a skeleton is
 * how that skeleton is published. `test/resume-templates.e2e-spec.ts` proves
 * both properties against a real collection.
 *
 * Run: `npm run harness:seed-templates`
 */
// The repo-wide env file at the root is the only source of vars.
import '../load-env';
import { connect, connection, model } from 'mongoose';
import {
  ResumeTemplate,
  ResumeTemplateSchema,
} from '../resume-harness/schemas/resume-template.schema';
import {
  DEFAULT_RESUME_TEMPLATES,
  seedResumeTemplates,
} from '../resume-harness/templates/resume-templates.seed';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await connect(uri);
  const TemplateModel = model(ResumeTemplate.name, ResumeTemplateSchema);
  // The unique index on `key` is what makes the upsert safe under a concurrent
  // run; creating it here means a fresh database does not need a separate step.
  await TemplateModel.syncIndexes();

  await seedResumeTemplates(TemplateModel);

  for (const template of DEFAULT_RESUME_TEMPLATES) {
    const knobs = template.knobs
      .map((k) => `${k.key}(${k.options.length})`)
      .join(' ');
    console.log(`✓ ${template.key.padEnd(20)} ${knobs}`);
  }

  console.log(`\nSeeded ${DEFAULT_RESUME_TEMPLATES.length} résumé templates.`);
  await connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
