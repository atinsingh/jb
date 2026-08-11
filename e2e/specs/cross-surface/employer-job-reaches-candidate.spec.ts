import { test, expect, storage } from '../../fixtures/test';
import { api, uniqueId, type TestUser } from '../../support/api';

/**
 * The marketplace bridge: a job an employer posts must become matchable to a
 * candidate.
 *
 * This is the single most important assertion in the suite, and it is here
 * because the product shipped for months without it being true. Two defects,
 * each invisible to a fully green unit suite:
 *
 *   1. The employer -> search bridge never ran the geography engine, so
 *      first-party jobs landed with `country` unset while `workplaceType` was
 *      set. That is the exact combination the matcher's Stage-1a pre-filter
 *      drops, because its escape hatch for un-normalized rows only forgives a
 *      missing country when `workplaceType` is ALSO unset.
 *
 *   2. The candidate's job profile contributed only its target countries. Its
 *      skills, role and minMatchScore were stored, displayed, and never read by
 *      matching — so a candidate with no parsed résumé skills scored as a
 *      zero-skill candidate and the whole pool fell below threshold.
 *
 * Each is a layer-boundary defect: both sides' own tests passed. Only crossing
 * the boundary catches them, which is what this spec does.
 *
 * Serial: these tests build on one shared job and one shared profile.
 */
test.describe.configure({ mode: 'serial' });

test.describe('an employer-posted job reaches the candidate matching pool', () => {
  const TARGET_COUNTRY = 'CA';
  const JOB_LOCATION = 'Toronto, Ontario, Canada';
  const SKILLS = ['TypeScript', 'Node.js', 'MongoDB'];

  let jobTitle: string;
  let employer: TestUser;
  let candidate: TestUser;
  let profileId: string;

  test.beforeAll(async () => {
    // Read the provisioned accounts directly; beforeAll has no fixtures.
    const accounts = require(require('path').join(
      __dirname,
      '../../.auth/accounts.json',
    ));
    employer = accounts.employer;
    candidate = accounts.candidate;
    jobTitle = `Staff Backend Engineer ${uniqueId('bridge')}`;
  });

  test('employer posts a job in a specific country', async () => {
    const res = await api.post<{ job: { _id?: string; id?: string } }>(
      '/api/employer/jobs',
      {
        title: jobTitle,
        companyName: 'E2E Bridge Labs',
        type: 'Full-time',
        location: JOB_LOCATION,
        isRemote: false,
        description:
          'Staff Backend Engineer building distributed payment services with ' +
          'Node.js, TypeScript and MongoDB. Ownership of service design and reliability.',
        requirements: ['8+ years backend engineering', 'Strong Node.js and TypeScript'],
        skills: SKILLS,
        status: 'active',
        visibility: 'public',
      },
      employer.token,
    );

    expect(res.job, 'employer job was not created').toBeTruthy();
  });

  test('a profile scoped to this test exists before anything queries against it', async () => {
    // Created here, first, and used explicitly by every later query in this
    // file via profileId. The candidate account is SHARED and PERSISTENT across
    // suite runs, so it may carry an active profile from unrelated earlier work
    // with its own (unrelated) skills and threshold — falling back to "whatever
    // profile happens to be active" would make this spec's result depend on
    // that leftover state instead of on what it actually creates.
    const profile = await api.post<any>(
      '/api/job-profiles',
      {
        profileName: `Backend ${TARGET_COUNTRY} ${uniqueId('profile')}`,
        role: 'Staff Backend Engineer',
        targetCountries: [TARGET_COUNTRY],
        skills: SKILLS,
        // Floor the threshold: reachability is what this spec is about, not
        // whether the scorer likes this particular pairing.
        minMatchScore: 0,
      },
      candidate.token,
    );

    profileId = profile?.id || profile?._id || profile?.profile?._id;
    expect(profileId, 'job profile was not created').toBeTruthy();

    // `active` is deliberately NOT a create/update field. Activation is a
    // guarded transition through its own endpoint because it enforces a
    // business rule — at most two profiles may be active at once — and letting
    // it through the normal DTO would route around that rule.
    await api.patch(
      `/api/job-profiles/${profileId}/activate`,
      { active: true },
      candidate.token,
    );
  });

  test('the posted job is normalized into the searchable pool with real geography', async () => {
    // The bridge is what makes an employer job findable at all. Asserting the
    // geography fields specifically is the regression guard: the job used to
    // arrive here with country unset, which silently removed it from matching.
    //
    // Polled rather than a single read: under concurrent load elsewhere in the
    // suite, the backend can legitimately take a moment to serve this request —
    // that is what a real user refreshing the page would also see, so a retry
    // here is honest, not a workaround for flakiness.
    let found: any;
    await expect
      .poll(
        async () => {
          const res = await api.get<{ jobs: any[] }>(
            `/api/matching/eligible-jobs?profileId=${profileId}&keywords=${encodeURIComponent(jobTitle)}&limit=20`,
            candidate.token,
          );
          found = res.jobs.find((j) => j.title === jobTitle);
          return !!found;
        },
        {
          message:
            `The job the employer just posted never reached the candidate-facing pool. ` +
            `The employer -> search bridge (PublisherService.publishEmployerJob) did not publish it.`,
          // A little generous: the rest of the suite is hammering the same
          // single backend process concurrently, and this must not confuse
          // "the server is busy" with "the bridge is broken".
          timeout: 25_000,
        },
      )
      .toBe(true);

    expect(
      found.location,
      'the published job lost its location on the way across the bridge',
    ).toContain('Toronto');
  });

  test('a candidate targeting that country can see it, with its skills counted', async () => {
    const res = await api.get<{
      jobs: any[];
      targetCountries: string[];
      candidateSkillCount: number;
    }>(
      `/api/matching/eligible-jobs?profileId=${profileId}&keywords=${encodeURIComponent(jobTitle)}&limit=20`,
      candidate.token,
    );

    expect(
      res.targetCountries,
      'the profile target countries never reached the matcher',
    ).toContain(TARGET_COUNTRY);

    // Regression for defect 2: the profile's own skills must reach the scorer.
    // This was 0 for a profile with three skills.
    expect(
      res.candidateSkillCount,
      `The job profile declared ${SKILLS.length} skills but the scorer counted ` +
        `${res.candidateSkillCount}. Profile skills are not reaching scoreProfile().`,
    ).toBeGreaterThan(0);

    const found = res.jobs.find((j) => j.title === jobTitle);
    expect(
      found,
      `A job posted in ${JOB_LOCATION} is invisible to a candidate targeting ` +
        `${TARGET_COUNTRY}. This is the geography-normalization bridge defect.`,
    ).toBeTruthy();
  });

  test('the candidate sees it in the browser, not just over the API', async ({
    browser,
  }) => {
    // The API passing while the page shows nothing is a real and repeated
    // failure mode here — a param dropped in a service helper made exactly this
    // happen — so the last assertion is made against the rendered page.
    const context = await browser.newContext({ storageState: storage.candidate });
    const page = await context.newPage();

    try {
      await page.goto(`/app/matches?profileId=${profileId}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('networkidle').catch(() => {});

      // Search narrows the list to our job regardless of pool size.
      const search = page.locator('input[type="search"], input[placeholder*="earch" i]').first();
      if (await search.count()) {
        await search.fill(jobTitle);
        await page.waitForLoadState('networkidle').catch(() => {});
      }

      await expect(
        page.locator('body'),
        'the matches page does not show the employer-posted job the API returns',
      ).toContainText(jobTitle, { timeout: 20_000 });
    } finally {
      await context.close();
    }
  });

  test('the profile threshold actually filters — it is not decorative', async () => {
    // minMatchScore lived on the profile, was shown in the UI, and was never
    // read; the global preference was used instead. Raising it to an
    // unreachable value must empty the result set.
    await api.patch(
      `/api/job-profiles/${profileId}`,
      { minMatchScore: 100 },
      candidate.token,
    );

    const res = await api.get<{ jobs: any[] }>(
      `/api/matching/eligible-jobs?profileId=${profileId}&keywords=${encodeURIComponent(jobTitle)}&limit=20`,
      candidate.token,
    );

    expect(
      res.jobs.find((j) => j.title === jobTitle),
      'a profile threshold of 100 still returned the job — the profile ' +
        'minMatchScore is being ignored in favour of the global preference',
    ).toBeFalsy();
  });
});
