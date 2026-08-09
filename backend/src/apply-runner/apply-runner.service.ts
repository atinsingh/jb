import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationEventsService } from '../applications/application-events.service';
import { StorageService } from '../storage/storage.service';
import { CandidateMaterialsService } from './ats/candidate-materials.service';
import { AtsAdapterRegistry } from './ats/ats-adapter.registry';
import { detectAtsType, resolveApplyUrl } from './ats/ats-detect';
import type { SubmitResult, SubmitScreenshot } from './ats/ats-adapter.interface';
import { AnswerResolverService } from '../answers/answer-resolver.service';

/**
 * How many filled-but-unreviewed applications a candidate may accumulate.
 *
 * `MAX_APPLICATIONS_PER_DAY` caps SUBMISSIONS; this caps PREPARES. Without it a
 * candidate who ignores the app for a week returns to 140 stale applications,
 * every one of them browser time spent against a form that may since have
 * changed. Preparation slows to match the rate the candidate actually reviews.
 */
const MAX_UNREVIEWED_PREPARES = Number(process.env.MAX_UNREVIEWED_PREPARES || 10);

/** How long a prepared application stays valid before it must be re-prepared. */
const PREPARED_TTL_DAYS = 7;

/** Puppeteer returns Buffer or Uint8Array depending on version — normalize. */
function toPngBuffer(shot: any): Buffer {
  if (Buffer.isBuffer(shot)) return shot;
  return Buffer.from(shot || []);
}

/**
 * Headless ATS submission runner (Greenhouse-first).
 *
 * SAFETY GATES (all enforced here):
 *   1. Default OFF — real submission only runs when `AUTO_APPLICATION_ENABLED==='true'`.
 *      With it unset the runner no-ops and never launches a browser.
 *   2. Greenhouse-only — any other ATS (or no apply URL) is set `needs_human`,
 *      never blind-submitted.
 *   3. CAPTCHA / unconfirmed submit → `needs_human` (decided by the adapter).
 *   4. Idempotency — only `status:'pending'` + `autoApplied:true` apps are eligible,
 *      and each is ATOMICALLY claimed (`atsMetadata.claimedAt`) before any browser
 *      work so it can never be submitted twice, even under concurrent delivery.
 *   5. Proof — before/after screenshots are persisted via StorageService and their
 *      URLs recorded on `application.proofDocuments` + `proofSubmittedAt`.
 */
@Injectable()
export class ApplyRunnerService {
  private readonly logger = new Logger(ApplyRunnerService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly applicationsService: ApplicationsService,
    private readonly applicationEventsService: ApplicationEventsService,
    private readonly candidateMaterialsService: CandidateMaterialsService,
    private readonly storageService: StorageService,
    private readonly registry: AtsAdapterRegistry,
    private readonly answers: AnswerResolverService,
  ) {}

  /**
   * PREPARE PASS — do everything except click submit.
   *
   * Reads the form, resolves every answer it can, fills them in, screenshots the
   * result, fingerprints the structure, and parks the application for the
   * candidate to approve. Blockers (attestations we refuse to guess, options we
   * cannot map confidently, questions never seen before) are recorded rather
   * than papered over.
   *
   * Deliberately NOT gated on `AUTO_APPLICATION_ENABLED`: that flag gates
   * SUBMISSION. Preparing clicks nothing and is safe to run with it off — which
   * is exactly how the answer bank fills up before anything is at stake.
   */
  async prepareOne(applicationId: string): Promise<{ id: string; status: string; blockers?: number; failReason?: string }> {
    // --- Atomic claim: pending -> preparing, once. -------------------------
    const claimed = await this.applicationModel
      .findOneAndUpdate(
        {
          _id: applicationId,
          status: 'pending',
          autoApplied: true,
          'atsMetadata.claimedAt': { $exists: false },
        },
        { $set: { status: 'preparing', 'atsMetadata.claimedAt': new Date() } },
        { new: true },
      )
      .exec();

    if (!claimed) {
      return { id: applicationId, status: 'skipped', failReason: 'not eligible or already claimed' };
    }

    const job = await this.jobModel.findById(claimed.jobId).exec();
    const applyUrl = resolveApplyUrl(job as any);
    const atsType = detectAtsType(applyUrl);
    const adapter = this.registry.resolve(applyUrl);

    await this.applicationModel.updateOne({ _id: applicationId }, { $set: { atsType } }).exec();

    if (!applyUrl || !adapter) {
      const reason = !applyUrl
        ? 'No apply URL on job — manual apply required'
        : `Unsupported ATS (${atsType}) — manual apply required`;
      await this.finish(applicationId, claimed, 'needs_human', reason);
      return { id: applicationId, status: 'needs_human', failReason: reason };
    }

    // Workday and friends prepare answers but cannot be driven headlessly to a
    // submit — they hand off to the candidate instead of pretending.
    if (!adapter.capabilities?.headlessPrepare) {
      const reason = `${atsType} requires you to complete the form yourself — we have prepared your answers`;
      await this.finish(applicationId, claimed, 'needs_human', reason);
      return { id: applicationId, status: 'needs_human', failReason: reason };
    }

    let browser: any;
    try {
      const materials = await this.candidateMaterialsService.assembleMaterials(
        String(claimed.candidateId),
        claimed,
      );

      browser = await this.launchBrowser();
      const page = await browser.newPage();

      // 1) Read the form.
      const schema = await adapter.introspect({ page, applyUrl });

      // 2) Resolve answers. The application is FOR the job's country, which is
      //    what country-scoped attestations are asking about.
      const resolved = await this.answers.resolve(String(claimed.candidateId), schema.fields, {
        companyName: (job as any)?.companyName,
        jobTitle: (job as any)?.title,
        jobDescription: (job as any)?.description,
        targetCountry: (job as any)?.country || null,
        identity: {
          fullName: materials.fullName,
          firstName: materials.firstName,
          lastName: materials.lastName,
          email: materials.email,
          phone: materials.phone,
          addressCity: materials.location,
          linkedinUrl: materials.linkedin,
          githubUrl: materials.github,
        },
      });

      // 3) Fill what we resolved.
      const values: Record<string, any> = {};
      for (const a of resolved.answers) values[a.fieldName] = a.value;
      const fillReport = await adapter.fill({ page, applyUrl }, values, materials);

      // 4) Proof: the filled form, exactly as it would be submitted.
      const shot = toPngBuffer(await page.screenshot({ fullPage: true }));
      const [screenshotUrl, formJsonUrl] = await Promise.all([
        this.persistArtifact(applicationId, 'prepared.png', shot, 'image/png'),
        this.persistArtifact(
          applicationId,
          'form-schema.json',
          Buffer.from(JSON.stringify(schema, null, 2)),
          'application/json',
        ),
      ]);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + PREPARED_TTL_DAYS * 24 * 60 * 60 * 1000);

      await this.applicationModel
        .updateOne(
          { _id: applicationId },
          {
            $set: {
              status: 'awaiting_approval',
              'artifacts.screenshotUrl': screenshotUrl,
              'artifacts.formJsonUrl': formJsonUrl,
              prepared: {
                fingerprint: schema.fingerprint,
                answers: resolved.answers,
                blockers: resolved.blockers,
                unknownQuestions: resolved.unknownQuestions,
                fillCoverage: fillReport.coverage,
                preparedAt: now,
                expiresAt,
              },
            },
          },
        )
        .exec();

      await this.applicationEventsService.recordEvent({
        applicationId: claimed._id as any,
        userId: claimed.candidateId,
        type: 'ats_prepared',
        message: `Prepared for your review — ${resolved.answers.length} answers, ${resolved.blockers.length} need you`,
        meta: {
          atsType,
          blockers: resolved.blockers.length,
          fillCoverage: fillReport.coverage,
        },
      });

      return { id: applicationId, status: 'awaiting_approval', blockers: resolved.blockers.length };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Prepare failed for application ${applicationId}: ${reason}`);
      await this.finish(applicationId, claimed, 'failed', `Prepare error: ${reason}`);
      return { id: applicationId, status: 'failed', failReason: reason };
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {
          /* already gone */
        }
      }
    }
  }

  /**
   * How many applications are filled and waiting on this candidate.
   * The trigger job stops preparing once this reaches the ceiling.
   */
  async unreviewedCount(candidateId: string): Promise<number> {
    return this.applicationModel
      .countDocuments({ candidateId, status: 'awaiting_approval' })
      .exec();
  }

  /** True when this candidate has room for another prepared application. */
  async hasPrepareCapacity(candidateId: string): Promise<boolean> {
    return (await this.unreviewedCount(candidateId)) < MAX_UNREVIEWED_PREPARES;
  }

  /** Store one prepare artifact and return a resolvable URL. */
  private async persistArtifact(
    applicationId: string,
    name: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string | undefined> {
    if (!buffer?.length) return undefined;
    const key = `prepared/${applicationId}/${Date.now()}-${name}`;
    try {
      const put = await this.storageService.put(key, buffer, { contentType });
      return this.storageService.getDriverName() === 's3'
        ? await this.storageService.getSignedUrl(put.key)
        : put.url;
    } catch (err) {
      this.logger.warn(
        `Failed to persist ${key}: ${err instanceof Error ? err.message : err}`,
      );
      return undefined;
    }
  }

  /** Real submission is gated behind AUTO_APPLICATION_ENABLED (default OFF). */
  private isAutoEnabled(): boolean {
    return process.env.AUTO_APPLICATION_ENABLED === 'true';
  }

  /**
   * Process up to `limit` pending, auto-applied applications.
   * No-op (and no browser) when auto-apply is disabled.
   */
  async process(limit = 10) {
    if (!this.isAutoEnabled()) {
      this.logger.log('AUTO_APPLICATION_ENABLED is off — apply-runner is a no-op.');
      return { enabled: false, processed: 0, results: [] as any[] };
    }

    const pending = await this.applicationModel
      .find({ status: 'pending', autoApplied: true })
      .limit(limit)
      .exec();

    const results: Array<{ id: string; status: string; failReason?: string }> = [];
    for (const app of pending) {
      const outcome = await this.submitOne(String(app._id));
      results.push(outcome);
    }

    return { enabled: true, processed: results.length, results };
  }

  /**
   * Submit a single application end-to-end. Safe to call directly (e.g. retry).
   * Returns the final status; never throws (errors → `failed`).
   */
  async submitOne(applicationId: string): Promise<{ id: string; status: string; failReason?: string }> {
    if (!this.isAutoEnabled()) {
      return { id: applicationId, status: 'skipped', failReason: 'auto-apply disabled' };
    }

    // --- Atomic claim: flip only if still pending+autoApplied and unclaimed. ----
    // This is the idempotency guard — a second delivery finds it already claimed
    // and skips, so no application is ever submitted twice.
    const claimed = await this.applicationModel
      .findOneAndUpdate(
        {
          _id: applicationId,
          status: 'pending',
          autoApplied: true,
          'atsMetadata.claimedAt': { $exists: false },
        },
        { $set: { 'atsMetadata.claimedAt': new Date() } },
        { new: true },
      )
      .exec();

    if (!claimed) {
      this.logger.debug(`Application ${applicationId} not eligible/already claimed — skipping.`);
      return { id: applicationId, status: 'skipped', failReason: 'not eligible or already claimed' };
    }

    // --- Resolve the apply URL + ATS type. -------------------------------------
    const job = await this.jobModel.findById(claimed.jobId).exec();
    const applyUrl = resolveApplyUrl(job as any);
    const atsType = detectAtsType(applyUrl);

    await this.applicationModel
      .updateOne({ _id: applicationId }, { $set: { atsType } })
      .exec();

    const adapter = this.registry.resolve(applyUrl);
    if (!applyUrl || !adapter) {
      const reason = !applyUrl
        ? 'No apply URL on job — manual apply required'
        : `Unsupported ATS (${atsType}) — manual apply required`;
      await this.finish(applicationId, claimed, 'needs_human', reason);
      return { id: applicationId, status: 'needs_human', failReason: reason };
    }

    // --- Assemble materials + drive a fresh browser for this one app. -----------
    const materials = await this.candidateMaterialsService.assembleMaterials(
      String(claimed.candidateId),
      claimed,
    );

    let browser: any;
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();

      const result: SubmitResult = await adapter.submit({ page, applyUrl, materials });

      // Persist proof screenshots regardless of outcome.
      const proofUrls = await this.persistProof(applicationId, result.screenshots || []);

      const status = result.ok ? 'submitted' : result.needsHuman ? 'needs_human' : 'failed';
      await this.finish(applicationId, claimed, status, result.failReason, {
        proofUrls,
        atsMetadata: result.atsMetadata,
        confirmationText: result.confirmationText,
      });
      return { id: applicationId, status, failReason: result.failReason };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`Submission errored for application ${applicationId}: ${reason}`);
      await this.finish(applicationId, claimed, 'failed', `Submission error: ${reason}`);
      return { id: applicationId, status: 'failed', failReason: reason };
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          this.logger.warn(
            `Failed to close browser for ${applicationId}: ${
              closeErr instanceof Error ? closeErr.message : closeErr
            }`,
          );
        }
      }
    }
  }

  /**
   * Puppeteer launch, isolated in one overridable method so unit tests can stub
   * the browser/page without ever launching Chromium.
   */
  protected async launchBrowser(): Promise<any> {
    return require('puppeteer').launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });
  }

  /**
   * Persist proof screenshots to storage and return their resolvable URLs.
   * Key shape: `proof/<applicationId>/<ts>-<step>.png`.
   */
  private async persistProof(
    applicationId: string,
    screenshots: SubmitScreenshot[],
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const shot of screenshots) {
      if (!shot?.buffer || !shot.buffer.length) continue;
      const key = `proof/${applicationId}/${Date.now()}-${shot.step}.png`;
      try {
        const put = await this.storageService.put(key, shot.buffer, { contentType: 'image/png' });
        const url =
          this.storageService.getDriverName() === 's3'
            ? await this.storageService.getSignedUrl(put.key)
            : put.url;
        urls.push(url);
      } catch (err) {
        this.logger.warn(
          `Failed to persist proof ${key}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return urls;
  }

  /**
   * Persist proof/metadata, set the terminal status (via ApplicationsService so
   * candidate notifications fire correctly), and record a timeline event.
   */
  private async finish(
    applicationId: string,
    app: ApplicationDocument,
    status: 'submitted' | 'needs_human' | 'failed',
    failReason?: string,
    extra?: { proofUrls?: string[]; atsMetadata?: Record<string, any>; confirmationText?: string },
  ): Promise<void> {
    const set: Record<string, any> = {};
    if (extra?.proofUrls && extra.proofUrls.length) {
      set.proofDocuments = extra.proofUrls;
      set.proofSubmittedAt = new Date();
    }
    if (extra?.atsMetadata) {
      // Merge onto the existing atsMetadata (which already holds claimedAt).
      for (const [k, v] of Object.entries(extra.atsMetadata)) set[`atsMetadata.${k}`] = v;
    }
    if (Object.keys(set).length) {
      await this.applicationModel.updateOne({ _id: applicationId }, { $set: set }).exec();
    }

    // Status change (+ notification policy) owned by ApplicationsService.
    await this.applicationsService.updateApplicationStatus(applicationId, status, failReason);

    await this.applicationEventsService.recordEvent({
      applicationId: app._id as any,
      userId: app.candidateId,
      type: `ats_${status}`,
      message:
        status === 'submitted'
          ? extra?.confirmationText || 'Application submitted by ATS runner'
          : failReason || `Application ${status}`,
      meta: { atsType: app.atsType, proofCount: extra?.proofUrls?.length || 0 },
    });
  }
}
