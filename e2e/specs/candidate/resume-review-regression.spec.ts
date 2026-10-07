import { test, expect, storage, expectNoHorizontalOverflow } from '../../fixtures/test';
import { PDFDocument, StandardFonts } from '../../../backend/node_modules/pdf-lib';

test.use({ storageState: storage.candidate });

test('credits stay visible and the comparison PDF remains mounted while reviewing and resizing', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const sheet = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  sheet.drawText('Built TypeScript APIs.', { x: 40, y: 700, size: 14, font });
  let remaining = 240;
  let finishComparison: (() => void) | undefined;
  await page.route('**/api/resume-harness/budget', route => route.fulfill({ json: { status: 'ready', remaining, limit: 500, resetAt: '2026-11-01' } }));
  await page.route('**/api/resume-builder/review-test', route => route.fulfill({ json: { id: 'review-test', name: 'My resume', source: { originalFilename: 'resume.pdf', jobDescription: 'TypeScript engineer' } } }));
  const pdfBytes = Buffer.from(await pdf.save());
  await page.route('**/api/resume-builder/review-test/compare/source', route => route.fulfill({ contentType: 'application/pdf', body: pdfBytes }));
  await page.route('**/api/resume-builder/review-test/compare', async route => {
    await new Promise<void>(resolve => { finishComparison = resolve; });
    remaining = 230;
    await route.fulfill({ json: { ats: { score: 80 }, match: { coverage: 90 }, aiContent: { composite: 20 }, annotations: [{ id: 'outcome', section: 'experience', color: 'amber', quote: 'Built TypeScript APIs.', message: 'Describe the outcome of these APIs.', fix: 'What did users accomplish with these APIs?' }] } });
  });
  await page.goto('/app/resume');
  await expect(page.getByTestId('ai-budget')).toContainText('Credits: 240 of 500 remaining');
  await page.goto('/app/resume?mode=compare&id=review-test');
  await expect(page.getByTestId('ai-budget')).toContainText('Credits: 240 of 500 remaining');
  const canvas = page.getByTestId('compare-document-preview').locator('canvas').first();
  // The original document must be readable before the agent finishes.
  await expect(canvas).toBeVisible();
  const originalCanvas = await canvas.elementHandle();
  await expect.poll(() => Boolean(finishComparison)).toBe(true);
  finishComparison!();
  await expect(page.getByTestId('compare-ats-score')).toHaveText('80%');
  await expect(page.getByTestId('ai-budget')).toContainText('Credits: 230 of 500 remaining');
  expect(await originalCanvas!.evaluate(element => element.isConnected)).toBe(true);
  await page.getByTestId('document-highlight-outcome').hover();
  await expect(page.getByRole('tooltip')).toContainText('What did users accomplish');
  await page.mouse.move(0, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page, 'Compare resume');
  await expect(canvas).toBeVisible();
  await page.getByTestId('compare-document-preview').evaluate(root => {
    (window as any).pdfRenderCount = 0;
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches('canvas') || node.querySelector('canvas'))) (window as any).pdfRenderCount++;
      }
    }).observe(root, { subtree: true, childList: true });
  });
  // Allow a genuine resize render, then ensure it settles rather than looping.
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => (window as any).pdfRenderCount)).toBeLessThanOrEqual(2);
});
