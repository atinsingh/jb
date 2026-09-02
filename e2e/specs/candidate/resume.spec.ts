import type { Page, Route } from '@playwright/test';
import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';

/**
 * Pick harness -> generate -> see output -> request a change -> see the changed
 * output.
 *
 * The `/api/resume-harness/*` responses are stubbed here on purpose. Running it
 * live would need Docker, the Agent Platform and metered provider keys, and it
 * would assert an LLM's prose rather than this screen's behaviour. The API
 * contract itself is covered end to end by `backend/test/resume-harness.e2e-spec.ts`,
 * once per harness; what is left to prove in a browser is that the screen picks
 * a harness, sends turns to the same session, and renders what comes back.
 */
test.use({ storageState: storage.candidate });
test.describe.configure({ mode: 'serial' });

const OPTIONS = {
  tier: 'PRO',
  harnesses: [
    { id: 'claude-code', label: 'Claude Code' },
    { id: 'codex', label: 'Codex' },
    { id: 'opencode', label: 'OpenCode' },
  ],
  models: [
    {
      alias: 'anthropic/claude-sonnet-4-5/high',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      effort: 'high',
      label: 'Sonnet 4.5 · thorough',
    },
    // Same model, second effort — this is what makes the effort selector a
    // real choice rather than a disabled control.
    {
      alias: 'anthropic/claude-sonnet-4-5/low',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      effort: 'low',
      label: 'Sonnet 4.5 · fast',
    },
    // A different model offering only one effort.
    {
      alias: 'bedrock/nova-micro/low',
      provider: 'bedrock',
      model: 'nova-micro',
      effort: 'low',
      label: 'Nova Micro · cheapest',
    },
  ],
  sandboxAvailable: true,
  // The screen gates on this rather than asking for the same facts again:
  // `missing` is required identity and blocks Start; `optionalGaps` only nudges.
  profile: {
    name: 'Jordan Reyes',
    headline: 'Senior Backend Engineer',
    roles: [],
    missing: [],
    optionalGaps: [],
    ready: true,
  },
};

const SESSION = {
  id: 'sess-e2e-1',
  harness: 'codex',
  harnessLabel: 'Codex',
  sandboxId: 'sbx-e2e-1',
  alias: OPTIONS.models[0].alias,
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  effort: 'high',
  modelLabel: OPTIONS.models[0].label,
  status: 'active',
  latex: '',
  revision: 0,
  compiled: false,
};

const V1 = '\\documentclass{article}\n\\begin{document}\nJordan Reyes — Backend Engineer\n\\end{document}';
const V2 = `${V1.replace('\\end{document}', '')}\\section*{Kubernetes}\n\\end{document}`;

/** One stubbed backend, shared by the whole file. */
async function stubHarnessApi(page: Page) {
  let turns = 0;

  await page.route('**/api/resume-harness/options', (route: Route) =>
    route.fulfill({ json: OPTIONS }),
  );

  await page.route('**/api/resume-harness/sessions', (route: Route) =>
    route.fulfill({ status: 201, json: SESSION }),
  );

  await page.route('**/api/resume-harness/sessions/*/turns', (route: Route) => {
    turns += 1;
    route.fulfill({
      status: 201,
      json: {
        ...SESSION,
        revision: turns,
        compiled: true,
        latex: turns === 1 ? V1 : V2,
        summary:
          turns === 1 ? 'Created resume.tex.' : 'Added a Kubernetes section.',
        // A one-byte PDF is enough: the assertion is that a preview renders,
        // not that Chromium can lay out a real document.
        pdfBase64: 'JVBERi0xLjcK',
      },
    });
  });

  await page.route('**/api/resume-harness/sessions/*', (route: Route) =>
    route.fulfill({ json: { ...SESSION, status: 'ended' } }),
  );
}

test.describe('LaTeX résumé — agent harness', () => {
  test('picks a harness, generates, then changes the same résumé', async ({ page }) => {
    await stubHarnessApi(page);
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    // ---- pick a harness ----
    await expect(page.getByTestId('harness-picker')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('harness-claude-code')).toBeVisible();
    await page.getByTestId('harness-codex').click();

    // The tier decides the model, so the candidate can see what they are on.
    await expect(page.getByTestId('resolved-alias')).toHaveText(OPTIONS.models[0].alias);

    await page.getByTestId('start-session').click();

    await expect(page.getByTestId('session-harness')).toHaveText('Codex');
    await expect(page.getByTestId('session-model')).toHaveText('claude-sonnet-4-5');
    await expect(page.getByTestId('session-effort')).toHaveText('high');

    // ---- generate ----
    await page.getByTestId('instruction').fill('Build a résumé for a backend engineer.');
    await page.getByTestId('send-instruction').click();

    await expect(page.getByTestId('latex-source')).toContainText('\\documentclass');
    await expect(page.getByTestId('latex-source')).toContainText('Jordan Reyes');
    await expect(page.getByTestId('pdf-preview')).toBeVisible();
    await expect(page.getByTestId('session-revision')).toHaveText('1');

    // ---- request a change, see the changed output ----
    await page.getByTestId('instruction').fill('Add a Kubernetes section.');
    await page.getByTestId('send-instruction').click();

    await expect(page.getByTestId('latex-source')).toContainText('Kubernetes');
    // The original document survived — this is an edit, not a regeneration.
    await expect(page.getByTestId('latex-source')).toContainText('Jordan Reyes');
    await expect(page.getByTestId('session-revision')).toHaveText('2');
    await expect(page.getByTestId('turn-summary')).toContainText('Kubernetes');

    await expectNoHorizontalOverflow(page, 'resume');
  });

  test('offers a new session instead of a harness switch, and degrades when the platform is down', async ({
    page,
  }) => {
    await stubHarnessApi(page);
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('start-session').click();
    await expect(page.getByTestId('session-bar')).toBeVisible();

    // There is no control that switches harness on a live session, because
    // there is no such operation — only "start a new one".
    await expect(page.getByTestId('switch-harness')).toBeVisible();
    await expect(page.getByRole('button', { name: /^switch harness$/i })).toHaveCount(0);

    // Platform unreachable: the screen says so rather than offering a start
    // button that cannot work.
    await page.route('**/api/resume-harness/options', (route: Route) =>
      route.fulfill({ json: { ...OPTIONS, sandboxAvailable: false } }),
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('platform-unavailable')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('start-session')).toBeDisabled();
  });
});

/**
 * The screen must never re-ask for something the account already answers.
 *
 * Identity is required and blocks generation; history is optional and only
 * nudges. Both are reported by the API from the candidate's own profile, so a
 * regression that reintroduced a "your name" input on this page would show up
 * here as a field that should not exist.
 */
test.describe('résumé — profile-sourced facts', () => {
  test('blocks hard on missing identity: no form, no start, clear route out', async ({ page }) => {
    await stubHarnessApi(page);
    await page.route('**/api/resume-harness/options', (route: Route) =>
      route.fulfill({
        json: {
          ...OPTIONS,
          profile: {
            ...OPTIONS.profile,
            missing: ['name', 'linkedin', 'location'],
            ready: false,
          },
        },
      }),
    );
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    // The blocker is the page, not a footnote under it.
    const gate = page.getByTestId('required-gate');
    await expect(gate).toBeVisible();
    await expect(gate).toContainText(/full name/i);
    await expect(gate).toContainText(/linkedin/i);
    await expect(gate).toContainText(/location/i);

    // Each missing field is its own row, so it is obvious how many remain.
    await expect(page.getByTestId('gate-field-name')).toBeVisible();
    await expect(page.getByTestId('gate-field-linkedin')).toBeVisible();
    await expect(page.getByTestId('gate-field-location')).toBeVisible();

    // Filled ones are not listed as outstanding.
    await expect(page.getByTestId('gate-field-email')).toHaveCount(0);

    await expect(page.getByTestId('gate-cta')).toHaveAttribute('href', '/app/settings');

    // The setup form is not merely disabled — it is not offered at all, so
    // there is nothing to fill in that would not work.
    await expect(page.getByTestId('harness-picker')).toHaveCount(0);
    await expect(page.getByTestId('start-session')).toHaveCount(0);
  });

  test('generates anyway when only the optional history is absent', async ({ page }) => {
    await stubHarnessApi(page);
    await page.route('**/api/resume-harness/options', (route: Route) =>
      route.fulfill({
        json: {
          ...OPTIONS,
          profile: {
            ...OPTIONS.profile,
            optionalGaps: ['experience', 'certifications'],
            ready: true,
          },
        },
      }),
    );
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    // A thin résumé beats a blocked one — the gap is a nudge, not a gate.
    await expect(page.getByTestId('profile-gaps')).toContainText(/work experience/i);
    await expect(page.getByTestId('start-session')).toBeEnabled();
  });

  test('asks only for per-résumé inputs, never for profile facts', async ({ page }) => {
    await stubHarnessApi(page);
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('target-role')).toBeVisible();
    await expect(page.getByTestId('job-description')).toBeVisible();

    // These live in Settings. An input for any of them here would mean a second
    // copy that drifts from the account.
    for (const gone of [/your name/i, /work authorisation/i, /seniority/i]) {
      await expect(page.getByLabel(gone)).toHaveCount(0);
    }
  });
});

/**
 * Model and effort are separate choices.
 *
 * The backend namespaces aliases as provider+model+effort, so both dropdowns
 * are derived from the tier-permitted alias list. Effort is its own control
 * because it is the dial a candidate reaches for — same model, more care, more
 * cost — and folded into one label it stops reading as a choice at all.
 */
test.describe('résumé — model and effort selection', () => {
  test('offers effort independently and resolves the right alias', async ({ page }) => {
    await stubHarnessApi(page);
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('model-select')).toHaveValue('claude-sonnet-4-5');
    await expect(page.getByTestId('effort-select')).toHaveValue('high');
    await expect(page.getByTestId('resolved-alias')).toHaveText(
      'anthropic/claude-sonnet-4-5/high',
    );

    // Changing effort alone picks the sibling alias for the same model.
    await page.getByTestId('effort-select').selectOption('low');
    await expect(page.getByTestId('resolved-alias')).toHaveText(
      'anthropic/claude-sonnet-4-5/low',
    );

    // A model with a single effort disables the control rather than pretending
    // there is a choice.
    await page.getByTestId('model-select').selectOption('nova-micro');
    await expect(page.getByTestId('resolved-alias')).toHaveText('bedrock/nova-micro/low');
    await expect(page.getByTestId('effort-select')).toBeDisabled();
  });

  test('starts the session on the alias the selectors resolved to', async ({ page }) => {
    await stubHarnessApi(page);
    let sent: any = null;
    await page.route('**/api/resume-harness/sessions', async (route: Route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: SESSION });
    });

    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('effort-select').selectOption('low');
    await page.getByTestId('start-session').click();
    await expect(page.getByTestId('session-bar')).toBeVisible();

    // The chosen effort must survive to the request — a selector that looks
    // right but posts the default alias is the failure this catches.
    expect(sent.alias).toBe('anthropic/claude-sonnet-4-5/low');
  });
});

/**
 * The gate must fail closed.
 *
 * `ready` is the server's verdict on whether a résumé can be written at all.
 * Treating "absent" or "unknown" as permission is the wrong default: a stale
 * backend, a trimmed response or a partial failure would silently re-enable
 * generation for a profile that cannot support it, and the candidate would
 * discover it as a 403 after committing to a session. Only an explicit
 * `ready: true` opens the form.
 *
 * This is a regression test for exactly that bug — a deployed backend that
 * predated the `profile` block left Start fully enabled on an empty profile.
 */
test.describe('résumé — the required-field gate fails closed', () => {
  const withOptions = async (page: Page, json: unknown) => {
    await stubHarnessApi(page);
    await page.route('**/api/resume-harness/options', (route: Route) =>
      route.fulfill({ json }),
    );
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });
  };

  test('blocks when the response carries no profile block at all', async ({ page }) => {
    const { profile, ...noProfile } = OPTIONS;
    await withOptions(page, noProfile);

    await expect(page.getByTestId('required-gate')).toBeVisible();
    await expect(page.getByTestId('start-session')).toHaveCount(0);
  });

  test('blocks when ready is missing from the profile', async ({ page }) => {
    await withOptions(page, {
      ...OPTIONS,
      profile: { name: 'Jordan Reyes', roles: [], missing: [], optionalGaps: [] },
    });

    await expect(page.getByTestId('required-gate')).toBeVisible();
    await expect(page.getByTestId('start-session')).toHaveCount(0);
  });

  test('blocks while options are still loading', async ({ page }) => {
    await stubHarnessApi(page);
    // Never resolves: the pre-response state must not be an open form.
    await page.route('**/api/resume-harness/options', () => {});
    await page.goto('/app/resume', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('start-session')).toHaveCount(0);
  });

  test('opens only on an explicit ready:true', async ({ page }) => {
    await withOptions(page, OPTIONS);
    await expect(page.getByTestId('required-gate')).toHaveCount(0);
    await expect(page.getByTestId('start-session')).toBeEnabled();
  });
});
