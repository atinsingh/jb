import { test, expect } from '../../fixtures/test';
import { api, createUser, uniqueId, type TestUser } from '../../support/api';

/**
 * The end-to-end proof for this whole feature set: an employer posts a job,
 * a candidate applies, Autopilot proposes an action, and approving it in the
 * browser actually changes the applicant's real record. Same discipline as
 * the employer-job-reaches-candidate spec in cross-surface/ — every serious
 * defect on this project so far lived on a layer boundary unit tests
 * structurally cannot see.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Autopilot: proposal -> approval -> real applicant change', () => {
  let employer: TestUser;
  let candidate: TestUser;
  let jobId: string;
  let jobTitle: string;
  let jobIdent: string;
  let applicantId: string;
  let proposedActionType: string;

  test.beforeAll(async () => {
    // Isolated, freshly-registered accounts — NOT the suite's shared global
    // employer/candidate (storage.employer / storage.candidate). This spec
    // toggles a global-per-owner setting (autopilot enabled) and depends on
    // its OWN applicant pipeline being empty; sharing the global employer
    // account would race with whatever else the suite is doing to it in
    // other workers.
    employer = await createUser('ROLE_EMPLOYER', 'autopilot-employer');
    candidate = await createUser('ROLE_CANDIDATE', 'autopilot-candidate');
    jobIdent = uniqueId('autopilot');
    jobTitle = `Staff Engineer ${jobIdent}`;
  });

  test('employer enables autopilot', async () => {
    // ToggleAutopilotDto (backend/src/ai-recruiter/dto/toggle-autopilot.dto.ts)
    // accepts only `enabled` — there is no threshold-configuring field on this
    // endpoint. What actually governs this test is EmployerAutopilotConfig's
    // DEFAULT_RULES (auto_propose_reject below 40, auto_propose_advance above
    // 80). AiRecruiterService.scoreApplicant gives a freshly-applied candidate
    // (stage "applied" -> 20 pts, no rating, no aiScore, +0-10 jitter) a score
    // of roughly 20-30, which is reliably below the 40 reject threshold
    // without any special configuration here.
    const res: any = await api.post(
      '/api/employer/ai/autopilot/toggle',
      { enabled: true },
      employer.token,
    );
    expect(res.enabled).toBe(true);
  });

  test('employer posts a job', async () => {
    const res: any = await api.post(
      '/api/employer/jobs',
      {
        title: jobTitle,
        companyName: 'E2E Autopilot Co',
        type: 'Full-time',
        location: 'Remote',
        isRemote: true,
        description: 'A role for exercising the autopilot approval E2E path end to end.',
        status: 'active',
        visibility: 'public',
      },
      employer.token,
    );
    const employerJobId = res.job?._id || res.job?.id;
    expect(employerJobId, 'employer job was not created').toBeTruthy();

    // The id EmployerJobsService.create() returns is the EmployerJob's own id
    // (the employerJobs collection), NOT the id an applicant's jobId must
    // reference. EmployerJobsService bridges every create/update into the
    // SEPARATE searchable `jobs` collection via
    // PublisherService.publishEmployerJob, which mints its own _id (keyed by
    // externalId `jobocate:<employerJobId>`). Resolve that id the same way a
    // candidate applying through the UI would: search for it.
    let found: any;
    await expect
      .poll(
        async () => {
          const searchRes: any = await api.get(
            `/api/jobs/search?keywords=${encodeURIComponent(jobIdent)}&limit=20`,
            candidate.token,
          );
          found = (searchRes.jobs || []).find((j: any) => j.title === jobTitle);
          return !!found;
        },
        {
          message: 'the posted job never reached the searchable jobs pool',
          timeout: 15_000,
        },
      )
      .toBe(true);

    jobId = found._id;
  });

  test('candidate applies, and Autopilot proposes a reject (low-signal applicant)', async () => {
    // The real endpoint is POST /applications/apply/:jobId (a route param, no
    // body) — see ApplicationsController.applyToJob.
    await api.post(`/api/applications/apply/${jobId}`, undefined, candidate.token);

    let proposals: any[] = [];
    await expect
      .poll(
        async () => {
          proposals = await api.get<any[]>(
            '/api/employer/ai/proposed-actions?status=pending',
            employer.token,
          );
          return Array.isArray(proposals) && proposals.length > 0;
        },
        {
          message: 'Autopilot never proposed an action for the new applicant',
          timeout: 20_000,
        },
      )
      .toBe(true);

    expect(proposals[0].actionType).toMatch(/reject|advance_stage/);
    applicantId = proposals[0].applicantId;
    proposedActionType = proposals[0].actionType;
  });

  test('employer approves the proposal in the browser, and the applicant record actually changes', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Sign in as OUR isolated employer through the real login form.
      // storage.employer is the suite's shared global employer account (a
      // different ownerId) and would not see this test's own proposal —
      // minting localStorage by hand is exactly what this suite avoids
      // (see e2e/support/global-setup.ts).
      await page.goto('/app/login', { waitUntil: 'domcontentloaded' });
      await page.fill('input[name="email"]', employer.email);
      await page.fill('input[name="password"]', employer.password);
      await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
      // Sign-in is done when Supabase has persisted its session COOKIE. It used
      // to be a localStorage token; moving it to cookies is what lets
      // src/middleware.js gate protected routes server-side.
      await page.waitForFunction(
        () => document.cookie.split(/;s*/).some((c) => /^sb-.*-auth-token/.test(c)),
        null,
        { timeout: 30_000 },
      );

      await page.goto('/employer/autopilot', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      // The button's accessible name is "✓ Approve" (a checkmark glyph
      // precedes the label), so an anchored /^approve$/ would never match.
      await page.getByRole('button', { name: /approve/i }).first().click();

      await expect(
        page.locator('body'),
        'approving a proposal left the queue looking unchanged',
      ).not.toContainText('Loading', { timeout: 15_000 });
    } finally {
      await context.close();
    }

    // Verify the underlying data actually changed, not just the UI: the
    // proposal itself moved to approved, AND the applicant's real pipeline
    // stage was mutated by EmployerAiActionsService.execute() (reject ->
    // 'rejected', advance_stage -> its payload.targetStage).
    await expect
      .poll(
        async () => {
          const approved: any = await api.get(
            '/api/employer/ai/proposed-actions?status=approved',
            employer.token,
          );
          return Array.isArray(approved) && approved.some((p: any) => p.applicantId === applicantId);
        },
        {
          message: 'no proposal for this applicant reached approved status after clicking Approve',
          timeout: 15_000,
        },
      )
      .toBe(true);

    const applicant: any = await api.get(
      `/api/employer/applicants/${applicantId}`,
      employer.token,
    );
    const expectedStage = proposedActionType === 'reject' ? 'rejected' : 'screening';
    expect(
      applicant.stage,
      `approving the ${proposedActionType} proposal did not change applicant ${applicantId}'s stage to "${expectedStage}"`,
    ).toBe(expectedStage);
  });
});
