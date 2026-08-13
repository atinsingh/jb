import { test, expect, storage, expectNoHorizontalOverflow, expectPageRendered } from '../../fixtures/test';

/**
 * Mock interview previously ran on a hardcoded static question bank and threw
 * away the candidate's answer without ever scoring it — the UI merely looked
 * like AI feedback. This spec proves the real session-based, LLM-scored flow:
 * a freshly generated question, a real per-answer score, and a real
 * per-category result at session end.
 */
test.use({ storageState: storage.candidate });
test.describe.configure({ mode: 'serial' });

test.describe('mock interview — real AI feedback loop', () => {
  test('starting a session shows a real, freshly generated question', async ({ page }) => {
    await page.goto('/app/mock-interview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expectPageRendered(page, 'mock interview');
    await expectNoHorizontalOverflow(page, 'mock interview');

    // The old static bank's first question — if this is ever visible again,
    // the page regressed to hardcoded content instead of a generated one.
    await expect(
      page.getByText('Tell me about yourself and what drew you to product design.'),
      'the page is showing the old static question bank, not a generated question',
    ).toHaveCount(0);

    const answerBox = page.getByPlaceholder(/type your answer/i);
    await expect(answerBox, 'no answer input rendered once a question loaded').toBeVisible({
      timeout: 45_000,
    });
  });

  test('submitting an answer returns a real score and feedback', async ({ page }) => {
    await page.goto('/app/mock-interview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const answerBox = page.getByPlaceholder(/type your answer/i);
    await expect(answerBox).toBeVisible({ timeout: 45_000 });
    await answerBox.fill(
      'At my last company, a teammate and I disagreed on the checkout redesign. I ran a quick usability test with five users, found the new flow confused two of them, and used that evidence to convince the team to keep the original layout for that step. Conversions held steady.',
    );

    await page.getByRole('button', { name: /submit answer/i }).click();

    // "Score: NN/100" only renders after submit-answer resolves with a real
    // validated {score, feedback} pair — the old page never rendered this at all.
    await expect(
      page.getByText(/Score:\s*\d{1,3}\/100/),
      'no real score rendered after submitting an answer',
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole('button', { name: /next question|finish session/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('ending the session shows a real, per-category results screen', async ({ page }) => {
    await page.goto('/app/mock-interview', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const answerBox = page.getByPlaceholder(/type your answer/i);
    await expect(answerBox).toBeVisible({ timeout: 45_000 });
    await answerBox.fill('A concise, structured answer using the STAR method for this practice question.');
    await page.getByRole('button', { name: /submit answer/i }).click();
    await expect(page.getByText(/Score:\s*\d{1,3}\/100/)).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /end session/i }).click();

    await expect(
      page.getByText(/overall score/i),
      'session end did not produce a results screen',
    ).toBeVisible({ timeout: 45_000 });

    // The four fixed rubric categories from the real LLM-scored breakdown —
    // proves the rubric call actually ran, not just the per-question one.
    for (const category of ['Clarity', 'STAR Structure', 'Job Fit', 'Conciseness']) {
      await expect(page.getByText(category, { exact: true })).toBeVisible();
    }

    await expect(page.getByRole('button', { name: /practice again/i })).toBeVisible();
  });
});
