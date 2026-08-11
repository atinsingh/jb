import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../app.module';
import { EmployerJob } from '../employer-jobs/schemas/employer-job.schema';
import { PublisherService } from '../ingestion/pipeline/publisher.service';

/**
 * Re-publish every directly-posted employer job through the employer -> search
 * bridge.
 *
 * Why this exists: the bridge originally wrote `workplaceType` but never ran the
 * geography engine, so first-party listings landed in the searchable `jobs`
 * collection with no `country`. That is the one state the matcher's Stage-1a
 * pre-filter drops — its escape hatch for un-normalized rows only forgives a
 * missing country when `workplaceType` is ALSO unset. The practical effect was
 * that a job an employer posted in Toronto could never be matched to a candidate
 * targeting Canada.
 *
 * Fixing the bridge only helps jobs posted after the fix. This repairs the ones
 * already written, and also publishes any employer job that never made it across
 * at all. `publishEmployerJob` upserts on a synthetic externalId, so running
 * this repeatedly is safe.
 *
 * Usage: npm run backfill:employer-geo
 */
async function backfill() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const employerJobModel = app.get<Model<any>>(getModelToken(EmployerJob.name));
    const publisher = app.get(PublisherService);

    const jobs = await employerJobModel.find({}).lean();
    console.log(`\nFound ${jobs.length} employer job(s) to re-publish.\n`);

    let repaired = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const outcome = await publisher.publishEmployerJob(job as any);
        repaired++;
        console.log(
          `  ok  ${String(job._id)}  ${job.title || '(untitled)'} — ${
            job.location || 'no location'
          } -> ${outcome.lifecycle}`,
        );
      } catch (err) {
        failed++;
        console.error(
          `  FAIL ${String(job._id)}  ${job.title || '(untitled)'}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    console.log(`\nRe-published ${repaired}, failed ${failed}.`);
    if (failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

backfill();
