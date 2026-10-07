import { test, expect } from '../../fixtures/test';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

test('uploaded resume scores stay stable and its PDF fits the comparison panel', async ({ page, candidateUser, browser }, testInfo) => {
  test.setTimeout(480_000);
  await page.goto('/app/login', { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', candidateUser.email);
  await page.fill('input[name="password"]', candidateUser.password);
  await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/);

  const recording = process.env.E2E_RECORD_DEMO === '1';
  const context = await browser.newContext({
    storageState: process.env.E2E_DEMO_STORAGE_STATE || await page.context().storageState(), viewport: { width: 1280, height: 720 },
    ...(recording ? { recordVideo: { dir: testInfo.outputPath('video'), size: { width: 1280, height: 720 } } } : {}),
  });
  const demo = await context.newPage();
  if (process.env.E2E_API_URL) {
    await context.route('http://localhost:8000/api/**', route => route.continue({
      url: route.request().url().replace('http://localhost:8000', process.env.E2E_API_URL!),
    }));
  }
  const failures: string[] = [];
  const beats: Array<{ time: number; text: string }> = [];
  const started = Date.now();
  const beat = async (text: string) => {
    beats.push({ time: (Date.now() - started) / 1000, text });
    if (recording) await demo.waitForTimeout(2500);
  };
  let comparisonRequest: any;
  demo.on('pageerror', error => failures.push(error.message));
  demo.on('response', response => { if (response.url().includes('/api/') && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  demo.on('request', request => {
    if (/\/resume-builder\/[^/]+\/compare$/.test(request.url())) comparisonRequest = request;
  });
  // The original file remains private. Only its contact row is masked in the recording.
  if (recording) await demo.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style');
      style.textContent = '.compare-pdf-page::after { content: "Contact details hidden for demo"; position: absolute; top: 7%; left: 0; width: 100%; height: 3%; z-index: 8; background: white; color: #7a7a7a; text-align: center; font: 9px Arial; padding-top: 3px; } [data-testid="comparison-edit-details"] section:first-child input { color: transparent !important; } nextjs-portal { display: none; }';
      document.head.appendChild(style);
    });
  });
  try {
    if (recording && process.env.E2E_DEMO_STORAGE_STATE) {
      await demo.goto('http://localhost:3000/app/dashboard', { waitUntil: 'networkidle' });
      await expect(demo.getByRole('heading', { name: 'Resume activity', exact: true })).toBeVisible();
      await beat('Open Resume from the navigation.');
      await demo.getByRole('navigation', { name: 'Candidate navigation' }).getByRole('link', { name: 'Resume', exact: true }).click();
      await demo.getByRole('button', { name: /^Compare Resume/ }).click();
      await demo.getByLabel('Existing resume').waitFor({ state: 'visible' });
    } else {
      await demo.goto('http://localhost:3000/app/resume?mode=compare', { waitUntil: 'networkidle' });
    }
    await beat('Upload your existing resume.');
    let file: { name: string; mimeType: string; buffer: Buffer };
    if (process.env.E2E_RESUME_DEMO_PATH) {
      file = { name: 'Harkit_Singh_Chhabra_Resume.pdf', mimeType: 'application/pdf', buffer: readFileSync(process.env.E2E_RESUME_DEMO_PATH) };
    } else {
      const { PDFDocument, StandardFonts } = require('../../../backend/node_modules/pdf-lib');
      const pdf = await PDFDocument.create();
      const sheet = pdf.addPage();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      ['Jordan Reyes', 'jordan@example.com', 'Summary', 'TypeScript engineer building APIs.', 'Experience', 'Engineer at Acme, Jan 2022 - Present', 'Deployed 8 Kubernetes services.', 'Skills', 'TypeScript, React, Kubernetes, PostgreSQL', 'Education', 'BSc, Example University'].forEach((line, index) => sheet.drawText(line, { x: 40, y: 800 - index * 35, size: 14, font }));
      file = { name: 'e2e-auto-comparison.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) };
    }
    await demo.getByLabel('Existing resume').setInputFiles(file);
    await beat('Add the job you have in mind.');
    await demo.getByLabel('Job description', { exact: true }).fill('Full Stack Software Engineer. Build and maintain TypeScript and React applications, APIs with Python, and PostgreSQL databases. Deploy services on Kubernetes and AWS. Experience with Terraform is required.');
    await beat('Compare the original document with the role.');
    const response = demo.waitForResponse(r => /\/resume-builder\/[^/]+\/compare$/.test(r.url()) && r.request().method() === 'POST', { timeout: 180_000 });
    await demo.getByRole('button', { name: 'Import and compare', exact: true }).click();
    const initial = await (await response).json();
    expect(initial.review).toMatchObject({ source: 'agent-session', sessionId: expect.any(String) });
    expect(initial.annotations.filter((item: any) => item.quote && item.id.startsWith('agent-')).length).toBeGreaterThan(0);
    await expect(demo.getByTestId('ai-budget')).toContainText('remaining');
    await expect(demo.getByTestId('compare-ats-score')).toHaveText(`${initial.ats.score}%`);
    const canvas = demo.getByTestId('compare-document-preview').locator('canvas').first();
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate(element => !!element.closest('.compare-document-scroll') && element.isConnected && element.getBoundingClientRect().width <= element.closest('.compare-document-scroll')!.clientWidth - 24 + 1)).toBe(true);
    await demo.getByTestId('compare-document-preview').scrollIntoViewIfNeeded();
    await beat('Review your scores and the skills the role asks for.');
    const highlights = demo.locator('mark[data-testid^="document-highlight-"]');
    await expect(highlights.nth(1)).toBeAttached();
    for (let index = 0; index < 2; index += 1) {
      await highlights.nth(index).hover();
      await expect(demo.getByRole('tooltip')).toBeVisible();
      await expect(demo.getByRole('tooltip')).not.toBeEmpty();
      await beat('Hover a highlighted point for specific feedback.');
    }
    await demo.mouse.move(1200, 80);
    if (recording) {
      mkdirSync(resolve('../frontend/public/demo'), { recursive: true });
      await demo.screenshot({ path: resolve('../frontend/public/demo/resume-comparison-poster.jpg'), type: 'jpeg', quality: 88 });
    }
    await expect(demo.getByTestId('comparison-edit-details')).not.toHaveAttribute('open', '');
    const refreshedResponse = demo.waitForResponse(r => /\/resume-builder\/[^/]+\/compare$/.test(r.url()) && r.request().method() === 'POST', { timeout: 180_000 });
    await demo.getByRole('button', { name: 'Refresh comparison', exact: true }).click();
    const refreshed = await (await refreshedResponse).json();
    expect([refreshed.ats.score, refreshed.match.coverage, refreshed.aiContent.composite]).toEqual([initial.ats.score, initial.match.coverage, initial.aiContent.composite]);
    await expect(canvas).toBeVisible();
    await beat('Same document, same role, consistent scores.');
    await demo.getByText('Edit resume details', { exact: true }).click();
    await expect(demo.getByRole('textbox', { name: 'Summary', exact: true })).toBeVisible();
    await beat('Keep your resume details editable in one place.');
    await demo.getByText('Edit resume details', { exact: true }).click();
    await demo.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => canvas.evaluate(element => !!element.closest('.compare-document-scroll') && element.isConnected && element.getBoundingClientRect().width <= element.closest('.compare-document-scroll')!.clientWidth - 24 + 1)).toBe(true);
    expect(await demo.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(failures).toEqual([]);
    const headers = { Authorization: comparisonRequest.headers().authorization };
    const apiRoot = new URL('/api/', comparisonRequest.url()).href;
    const saved = await demo.request.get(`${apiRoot}resume-builder`, { headers });
    expect(saved.ok()).toBe(true);
    const tracked = (await saved.json()).find((resume: any) => String(resume.id) === String(initial.resumeId));
    expect(tracked.comparisonHistory).toEqual(expect.arrayContaining([expect.objectContaining({
      atsScore: initial.ats.score, jobMatchScore: initial.match.coverage, contentScore: initial.aiContent.composite,
    })]));
    expect(tracked.comparisonHistory.length).toBeGreaterThanOrEqual(2);
    const logins = await demo.request.get(`${apiRoot}auth/login-history`, { headers });
    expect(logins.ok()).toBe(true);
    const loginHistory = await logins.json();
    expect(loginHistory).toEqual(expect.arrayContaining([expect.objectContaining({ method: 'password', at: expect.any(String) })]));
    const again = await demo.request.get(`${apiRoot}auth/login-history`, { headers });
    expect(await again.json()).toEqual(loginHistory);
    expect(JSON.stringify(loginHistory)).not.toContain('sessionId');
    if (recording) writeFileSync(testInfo.outputPath('beats.json'), JSON.stringify({ beats, score: initial.ats.score, match: initial.match.coverage, content: initial.aiContent.composite, duration: (Date.now() - started) / 1000 }));
  } finally {
    const video = demo.video();
    if (comparisonRequest) await demo.request.delete(comparisonRequest.url().replace(/\/compare$/, ''), { headers: { Authorization: comparisonRequest.headers().authorization } });
    await context.close();
    if (recording && video) await video.saveAs(testInfo.outputPath('resume-comparison.webm'));
  }
});
