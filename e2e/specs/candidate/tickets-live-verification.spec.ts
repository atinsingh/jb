import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Opt-in acceptance replay against real saved model reviews; no API interception.
const reportPath = process.env.E2E_LIVE_REPORT;
test.describe('Saved live ATS review acceptance', () => {
  test.skip(!reportPath, 'Set E2E_LIVE_REPORT to a live acceptance report');
  test('renders PDF and DOCX originals with grounded comments and cached scores', async ({ page }) => {
    test.setTimeout(180_000);
    const report = JSON.parse(fs.readFileSync(reportPath!, 'utf8'));
    expect(report.runs.filter((r: any) => r.owner === 'candidate' && r.result)).toHaveLength(2);
    await page.goto('/app/login');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="email"]').fill(report.candidate.email);
    await page.locator('input[name="password"]').fill('E2ePassw0rd!2026');
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    for (const run of report.runs.filter((r: any) => r.owner === 'candidate' && r.result)) {
      await page.goto(`/app/resume?mode=compare&id=${run.resumeId}`);
      await expect(page.getByTestId('compare-ats-score')).toHaveText(String(run.result.ats.score), { timeout: 60_000 });
      await expect(page.getByTestId('compare-match-score')).toHaveText(String(run.result.match.coverage));
      await expect(page.getByTestId('compare-document-preview')).toBeVisible();
      for (const annotation of run.result.annotations) {
        const highlight = page.getByTestId(`document-highlight-${annotation.id}`).first();
        await expect(highlight).toBeVisible();
      }
      await page.screenshot({ path: path.join(path.dirname(reportPath!), `live-${run.ext}-review.png`), fullPage: true });
    }
  });
});
