import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';

test.use({ storageState: storage.candidate, timezoneId: 'America/Toronto' });

test('dashboard filters recorded resume and login statistics by local day, week and month', async ({ page, guards }, testInfo) => {
  let resumes: any[] = [
    ...Array.from({ length: 6 }, (_, index) => ({ id: String(index), name: `Private resume ${index}`, creationMethod: 'imported', status: 'ready', comparisonHistory: [{ at: index < 3 ? '2026-10-07T01:00:00Z' : index < 5 ? '2026-10-05T14:00:00Z' : '2026-09-30T14:00:00Z', atsScore: 90, jobMatchScore: 80 }] })),
    { id: 'archived', creationMethod: 'imported', status: 'archived', comparisonHistory: [{ at: '2026-10-01T14:00:00Z', atsScore: 60, jobMatchScore: 50 }] },
    { id: 'manual', creationMethod: 'manual' },
  ];
  let sessions: any[] = [
    { id: 'generated', name: 'Private generated draft', revision: 2, hasCurrentPdf: true, turns: [{ kind: 'instruction', revision: 1, latex: 'draft', compiled: true, hasPdf: true, createdAt: '2026-10-06T14:00:00Z' }, { kind: 'look-change', revision: 2, latex: 'draft', compiled: true, hasPdf: true, createdAt: '2026-10-06T15:00:00Z' }] },
    { id: 'edited', revision: 1, hasCurrentPdf: false, turns: [{ kind: 'instruction', revision: 1, latex: 'draft', compiled: false, createdAt: '2026-10-01T14:00:00Z' }] },
    { id: 'empty', revision: 0, hasCurrentPdf: false },
    { id: 'archived', revision: 4, hasCurrentPdf: true, archivedAt: '2026-10-01' },
  ];
  await page.route('**/api/resume-builder', route => route.fulfill({ json: resumes }));
  await page.route('**/api/resume-harness/sessions', route => route.fulfill({ json: sessions }));
  let logins = [{ at: '2026-10-06T13:00:00Z', method: 'google' }, { at: '2026-10-01T13:00:00Z', method: 'password' }];
  await page.route('**/api/auth/login-history', route => route.fulfill({ json: logins }));
  await page.goto('/app/dashboard');
  await page.getByLabel('Activity date', { exact: true }).fill('2026-10-06');
  const metric = (label: string) => page.getByRole('group', { name: label, exact: true }).locator('[data-stat-value]');
  await expect(metric('Comparisons completed')).toHaveText('6');
  await expect(metric('Resume generations')).toHaveText('2');
  await expect(metric('Average ATS match')).toHaveText('85%');
  await expect(metric('Average job match')).toHaveText('75%');
  await expect(metric('PDFs generated')).toHaveText('2');
  await expect(metric('Active resume days')).toHaveText('3');
  await expect(page.getByRole('region', { name: 'Login history' })).toContainText('2 sign-ins');
  await expect(page.getByRole('table', { name: 'Daily resume activity' }).getByRole('row')).toHaveCount(32);
  await page.getByRole('button', { name: 'Week', exact: true }).click();
  await expect(metric('Comparisons completed')).toHaveText('5');
  await expect(metric('Resume generations')).toHaveText('1');
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(metric('Comparisons completed')).toHaveText('3');
  await expect(metric('Average ATS match')).toHaveText('90%');
  await expect(page.getByRole('region', { name: 'Login history' })).toContainText('1 sign-in');
  await page.getByLabel('Activity date', { exact: true }).fill('2026-10-01');
  await expect(metric('Comparisons completed')).toHaveText('1');
  await expect(metric('Resume generations')).toHaveText('1');
  await expect(page.getByRole('region', { name: 'Login history' })).toContainText('Email and password');
  for (const [label, value] of [['Imported resumes', '6'], ['Resumes generated', '2'], ['PDFs ready', '1'], ['Drafts awaiting generation', '1']]) {
    await expect(page.getByRole('group', { name: label, exact: true })).toContainText(value);
  }
  await expect(page.getByRole('link', { name: /Compare a resume|Create a resume|Open comparison|View resume library/ })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/Private resume|Private generated|Recent imports|Recent drafts/);
  await expect(page.getByRole('navigation', { name: 'Candidate navigation' }).getByRole('link', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('dashboard-stats.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, 'Resume dashboard');
  resumes = [];
  sessions = [];
  logins = [];
  await page.reload();
  await expect(page.getByRole('group', { name: 'Imported resumes', exact: true })).toContainText('0');
  await expect(page.getByRole('group', { name: 'Resumes generated', exact: true })).toContainText('0');
  await expect(metric('Comparisons completed')).toHaveText('0');
  await expect(metric('Average ATS match')).toHaveText('—');
  await expect(page.getByRole('region', { name: 'Login history' })).toContainText('No recorded sign-ins');
  guards.allowFailures('/api/resume-builder');
  guards.allowConsoleErrors(); // The intentionally unavailable endpoint logs a failed HTTP request.
  await page.route('**/api/resume-builder', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.reload();
  await expect(metric('Comparisons completed')).toHaveText('—');
  await expect(metric('Resume generations')).toHaveText('0');
  await expect(page.locator('main').getByRole('alert')).toContainText('Some statistics are unavailable');
});

