/**
 * Manual end-to-end check of the resume harness against real infrastructure.
 *
 * Boots the real AppModule and calls ResumeHarnessService directly, so it
 * exercises alias resolution, sandbox provisioning, context-file generation,
 * the harness CLI, the model and the LaTeX build — everything except the HTTP
 * layer and its auth, which the e2e suite already covers.
 *
 * This is intentionally NOT part of any test suite: it spends real money and
 * needs Docker, the proxy and provider credentials.
 *
 *   npx ts-node -T src/scripts/verify-harness-e2e.ts [harness] [alias]
 */
import '../load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ResumeHarnessService } from '../resume-harness/resume-harness.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

const HARNESS = (process.argv[2] || 'opencode') as any;
const ALIAS = process.argv[3] || 'bedrock/nova-micro/low';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const service = app.get(ResumeHarnessService);
  const users = app.get<Model<any>>(getModelToken('User'));

  const user =
    (await users.findOne({ email: /harkit/i })) ||
    (await users.findOne({ role: 'ROLE_CANDIDATE' })) ||
    (await users.findOne({}));
  if (!user) throw new Error('no user in the database to run as');
  const userId = String(user._id);
  console.log(`running as ${user.email} (${user.currentPlanType || 'FREE'})`);

  const options = await service.options(userId);
  console.log(
    `tier=${options.tier} sandbox=${options.sandboxAvailable} models=${options.models
      .map((m: any) => m.alias)
      .join(', ')}`,
  );

  console.log(`\n--- starting ${HARNESS} on ${ALIAS} ---`);
  const session = await service.startSession(userId, {
    harness: HARNESS,
    alias: ALIAS,
  });
  console.log(
    `session ${session.id} | sandbox ${session.sandboxId} | ${session.model} @ ${session.effort}`,
  );

  try {
    console.log('\n--- turn 1: create ---');
    const first = await service.runTurn(userId, session.id, {
      instruction:
        'Create a one-page resume for Jordan Reyes, a senior backend engineer ' +
        'with 8 years of experience in Node.js, PostgreSQL and AWS. Include ' +
        'sections for Summary, Experience and Skills. Keep it simple and make ' +
        'sure it compiles.',
    });
    console.log(
      `revision=${first.revision} compiled=${first.compiled} latex=${first.latex.length} bytes pdf=${first.pdfBase64 ? 'yes' : 'no'}`,
    );
    if (first.compileLog) console.log(`compile log: ${first.compileLog.slice(0, 400)}`);
    console.log(`summary: ${first.summary ?? '(none)'}`);
    console.log(`\n${first.latex.slice(0, 900)}\n`);

    console.log('--- turn 2: update the same artifact ---');
    const second = await service.runTurn(userId, session.id, {
      instruction: 'Add a Skills bullet for Kubernetes. Change nothing else.',
    });
    console.log(
      `revision=${second.revision} compiled=${second.compiled} latex=${second.latex.length} bytes`,
    );
    console.log(
      `kubernetes present: ${/kubernetes/i.test(second.latex)} | still has Jordan Reyes: ${/Jordan Reyes/i.test(second.latex)}`,
    );
  } finally {
    console.log('\n--- teardown ---');
    const ended = await service.endSession(userId, session.id);
    console.log(`status=${ended.status}`);
    await app.close();
  }
}

main().catch(async (err) => {
  console.error('FAILED:', err?.message || err);
  process.exit(1);
});
