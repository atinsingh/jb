import { test, expect, type Browser, type Locator, type Page, type TestInfo } from '../../fixtures/test';
import type { BrowserContextOptions } from '@playwright/test';
import { login, TEST_PASSWORD, api } from '../../support/api';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DEMO_EMAIL = 'maya.ellison@example.com';
const ROLE = 'Senior Full-Stack Engineer';
const JOB = [
  'Senior Full-Stack Engineer at Northwind Labs, Toronto (hybrid).',
  'Build the customer platform used by school and finance teams.',
  'TypeScript, React, and Node APIs. PostgreSQL. AWS, Docker, and Kubernetes.',
  'Accessible interface work, mentoring, and on-call.',
  'Nice to have: GraphQL and Terraform.',
].join(' ');

const PROFILE = {
  name: 'Maya Ellison',
  phone: '416-555-0148',
  location: 'Toronto, ON',
  headline: 'Full-Stack Software Engineer',
  linkedin: 'https://www.linkedin.com/in/maya-ellison',
  summary: 'Software engineer who builds TypeScript and React products for schools and finance teams. Ships Node APIs, PostgreSQL data models, and AWS deployments, and keeps the interface accessible.',
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Accessibility'],
  experience: [
    {
      title: 'Software Engineer',
      company: 'Northline',
      location: 'Toronto, ON',
      startDate: 'Jan 2023',
      current: true,
      description: 'Builds the course platform used by school operators.',
      achievements: [
        'Built a multi-tenant course platform in React and Node for school operators.',
        'Designed PostgreSQL schemas and APIs used by 40 schools.',
        'Deployed services on AWS with Docker and Kubernetes, cutting releases from weekly to daily.',
      ],
    },
    {
      title: 'Full-Stack Developer',
      company: 'Harbor & Co.',
      location: 'Toronto, ON',
      startDate: 'Jun 2021',
      endDate: 'Dec 2022',
      description: 'Shipped the customer billing product.',
      achievements: [
        'Led the customer billing UI in React and a Node payments API.',
        'Added accessible forms and keyboard flows used by finance staff every day.',
      ],
    },
  ],
  education: [
    {
      degree: 'BSc Computer Science',
      institution: 'University of Toronto',
      location: 'Toronto, ON',
      startDate: '2017',
      endDate: '2021',
    },
  ],
};

test.describe('homepage product walkthroughs', () => {
  test.skip(process.env.E2E_RECORD_DEMO !== '1', 'Set E2E_RECORD_DEMO=1 to record homepage videos');
  test.describe.configure({ mode: 'serial', timeout: 720_000 });

  let storageState: BrowserContextOptions['storageState'];

  test.beforeAll(async ({ browser }) => {
    const token = await ensureDemoUser();
    const saved = await api.patch<any>('/api/users/profile', PROFILE, token);
    const experience = saved.user?.experience || saved.experience || [];
    if (!experience[0]?.startDate || !experience[0]?.achievements?.length) {
      throw new Error('Profile history was not stored with dates and achievements');
    }
    await api.get('/api/resume-harness/budget', token);
    await grantDemoCredits(saved.user?._id || saved.user?.id || saved._id);
    const budget = await api.get<any>('/api/resume-harness/budget', token);
    if ((budget.remaining ?? 0) < 200) throw new Error(`Demo account has too few credits (${budget.remaining})`);

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000/app/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', DEMO_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.locator('form').getByRole('button', { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 30_000 });
    storageState = await context.storageState();
    await context.close();
  });

  test('records the comparison walkthrough', async ({ browser }, testInfo) => {
    const { page: demo, openedAt } = await openRecording(browser, testInfo, storageState);
    const beats: Array<{ time: number; text: string }> = [];
    const at = () => (Date.now() - openedAt) / 1000;
    const beat = (text: string) => beats.push({ time: at(), text });
    let segments: Array<[number, number]> = [];
    try {
      await demo.goto('http://localhost:3000/app/resume?mode=compare', { waitUntil: 'domcontentloaded' });
      const upload = demo.getByTestId('compare-resume-upload');
      await upload.waitFor({ state: 'visible' });
      const intro = at();
      beat('Upload your resume.');
      await demo.getByLabel('Existing resume').setInputFiles({
        name: 'Maya_Ellison_Resume.pdf',
        mimeType: 'application/pdf',
        buffer: await resumePdf(browser),
      });
      await demo.waitForTimeout(500);
      beat('Add the role you have in mind.');
      await demo.getByLabel('Job description', { exact: true }).fill(JOB);
      await demo.waitForTimeout(700);
      beat('Compare the document with that role.');
      const pending = demo.waitForResponse(
        (response) => /\/resume-builder\/[^/]+\/compare$/.test(response.url()) && response.request().method() === 'POST',
        { timeout: 180_000 },
      );
      await demo.getByRole('button', { name: 'Import and compare', exact: true }).click();
      const preview = demo.getByTestId('compare-document-preview');
      await preview.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
      if (await preview.count()) await preview.scrollIntoViewIfNeeded();
      await demo.waitForTimeout(2200);
      const checkingEnd = at();
      const result = await (await pending).json();
      expect(result.ats?.score).toEqual(expect.any(Number));
      await expect(demo.getByTestId('compare-ats-score')).toBeVisible({ timeout: 30_000 });
      await pinPanels(demo);
      const scoresAt = at();
      beat('Review your scores.');
      await zoomToward(demo, demo.locator('[data-testid="compare-ats-card"]').locator('xpath=..'), 2.5);
      await demo.waitForTimeout(1500);
      beat('Read the comments under the scores.');
      await zoomToward(demo, demo.getByTestId('comparison-suggestions'), 1.85);
      await demo.waitForTimeout(1600);
      await zoomOut(demo);
      const mark = demo.locator('mark[data-testid^="document-highlight-"]').first();
      await mark.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
      await mark.hover();
      await expect(demo.locator('[role="tooltip"]:not([data-demo-tip])')).toBeVisible();
      await parkTooltip(demo);
      beat('Open a highlighted line on the resume.');
      await zoomToward(demo, mark, 1.75, false);
      await revealTooltip(demo, mark);
      await demo.waitForTimeout(1500);
      await saveFrame(demo, 'resume-comparison-poster.jpg');
      await demo.waitForTimeout(400);
      segments = [[intro, checkingEnd], [scoresAt, at()]];
      const remapped = remapBeats(beats, segments);
      writeCaptions('resume-comparison.vtt', remapped.beats, remapped.end);
    } finally {
      await finishRecording(demo, testInfo, 'resume-comparison.webm', segments);
    }
  });

  test('records the generate walkthrough', async ({ browser }, testInfo) => {
    const { page: demo, openedAt } = await openRecording(browser, testInfo, storageState);
    const beats: Array<{ time: number; text: string }> = [];
    const at = () => (Date.now() - openedAt) / 1000;
    const beat = (text: string) => beats.push({ time: at(), text });
    let segments: Array<[number, number]> = [];
    try {
      await demo.goto('http://localhost:3000/app/resume?mode=generate', { waitUntil: 'domcontentloaded' });
      await expect(demo.getByTestId('profile-facts')).toBeVisible({ timeout: 30_000 });
      await expect(demo.getByTestId('required-gate')).toHaveCount(0);
      const intro = at();
      beat('Choose a template.');
      const template = demo.getByTestId('template-card-classic-serif');
      await template.scrollIntoViewIfNeeded();
      await template.click();
      await demo.waitForTimeout(500);
      beat('Add the role and the job description.');
      await demo.getByTestId('target-role').fill(ROLE);
      await demo.getByTestId('job-description').fill(JOB);
      await demo.waitForTimeout(600);
      beat('Generate the resume from your profile.');
      await demo.getByTestId('start-session').click();
      await expect(demo.getByTestId('instruction')).toBeVisible({ timeout: 120_000 });
      await demo.getByTestId('instruction').fill('Write a one-page resume for this role. Use only the jobs, dates, education, and skills in my profile.');
      await demo.getByTestId('send-instruction').click();
      await demo.waitForTimeout(1800);
      const workingEnd = at();
      const failed = demo.getByTestId('harness-error');
      await expect(demo.getByTestId('pdf-preview')).toBeVisible({ timeout: 240_000 });
      await expect(failed).toHaveCount(0);
      await expect(demo.getByTestId('live-status')).toHaveCount(0, { timeout: 240_000 });
      const pdf = demo.getByTestId('pdf-preview');
      await pdf.evaluate((frame: HTMLIFrameElement) => {
        const src = frame.getAttribute('src') || '';
        if (!src.includes('#zoom=')) frame.setAttribute('src', `${src}#zoom=page-width&toolbar=0`);
        frame.closest('section')?.scrollIntoView({ block: 'center' });
      });
      await demo.waitForTimeout(400);
      const pdfAt = at();
      beat('Review the finished PDF.');
      await zoomToward(demo, pdf, 1.28);
      await demo.waitForTimeout(1400);
      const pdfEnd = at();
      await zoomOut(demo);
      beat('Run an ATS match on this resume.');
      const ats = demo.getByTestId('ats-panel');
      await ats.scrollIntoViewIfNeeded();
      await expect(demo.getByTestId('run-ats')).toBeEnabled({ timeout: 30_000 });
      const atsClick = at();
      await demo.getByTestId('run-ats').click();
      await demo.waitForTimeout(1600);
      const atsWaitEnd = at();
      await expect(demo.getByTestId('ats-score')).toBeVisible({ timeout: 180_000 });
      await ats.scrollIntoViewIfNeeded();
      const atsResult = at();
      beat('Review the ATS score, gaps, and recommendations.');
      await zoomToward(demo, demo.getByTestId('ats-score'), 1.45);
      await demo.waitForTimeout(1100);
      await zoomToward(demo, demo.getByTestId('ats-gaps'), 1.4, true);
      await demo.waitForTimeout(1200);
      await saveFrame(demo, 'resume-generate-poster.jpg');
      await demo.waitForTimeout(350);
      segments = [[intro, workingEnd], [pdfAt, pdfEnd], [atsClick, atsWaitEnd], [atsResult, at()]];
      const remapped = remapBeats(beats, segments);
      writeCaptions('resume-generate.vtt', remapped.beats, remapped.end);
    } finally {
      await finishRecording(demo, testInfo, 'resume-generate.webm', segments);
    }
  });
});

async function pinPanels(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('.compare-resume-aside, .app-v3-header').forEach((node) => {
      if (node instanceof HTMLElement) node.style.setProperty('position', 'static', 'important');
    });
  });
}

async function zoomToward(page: Page, locator: Locator, scale: number, scrollFirst = true) {
  await page.evaluate(() => {
    const root = document.body;
    root.style.transition = 'transform 420ms cubic-bezier(0.22, 0.82, 0.24, 1)';
    root.style.transform = 'none';
  });
  await page.waitForTimeout(460);
  if (scrollFirst) {
    await locator.first().evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }));
    await page.waitForTimeout(180);
  }
  const viewport = page.viewportSize() ?? { width: 1600, height: 900 };
  const box = await locator.evaluateAll((els) => {
    let next: { x: number; y: number; w: number; h: number } | null = null;
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      if (!next) {
        next = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
        continue;
      }
      const x = Math.min(next.x, rect.x);
      const y = Math.min(next.y, rect.y);
      next = {
        x,
        y,
        w: Math.max(next.x + next.w, rect.x + rect.width) - x,
        h: Math.max(next.y + next.h, rect.y + rect.height) - y,
      };
    }
    const origin = document.body.getBoundingClientRect();
    if (!next) return null;
    return { x: next.x - origin.x, y: next.y - origin.y, w: next.w, h: next.h, ox: origin.x, oy: origin.y };
  });
  if (!box?.w || !box.h) return;
  const amount = Math.max(1.2, Math.min(scale, (viewport.width * 0.78) / box.w, (viewport.height * 0.7) / box.h));
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  await page.evaluate(({ cx, cy, amount, vx, vy }) => {
    const root = document.body;
    document.documentElement.style.background = '#101114';
    document.documentElement.style.overflow = 'hidden';
    document.querySelectorAll('.app-v3-header').forEach((node) => {
      if (node instanceof HTMLElement) node.style.setProperty('visibility', 'hidden', 'important');
    });
    const tip = document.querySelector('[role="tooltip"]:not([data-demo-tip])');
    if (tip instanceof HTMLElement) tip.style.visibility = 'hidden';
    root.style.transformOrigin = '0 0';
    root.style.transition = 'transform 900ms cubic-bezier(0.16, 0.84, 0.22, 1)';
    root.style.transform = `translate(${vx}px, ${vy}px) scale(${amount}) translate(${-cx}px, ${-cy}px)`;
  }, {
    cx,
    cy,
    amount,
    vx: viewport.width / 2 - box.ox,
    vy: viewport.height * 0.48 - box.oy,
  });
  await page.waitForTimeout(980);
}

async function parkTooltip(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-demo-tip]').forEach((node) => node.remove());
    const tip = document.querySelector('[role="tooltip"]:not([data-demo-tip])');
    if (!(tip instanceof HTMLElement)) return;
    const node = tip.cloneNode(true);
    if (!(node instanceof HTMLElement)) return;
    node.setAttribute('data-demo-tip', '1');
    node.style.visibility = 'hidden';
    node.style.position = 'fixed';
    node.style.zIndex = '4000';
    node.style.pointerEvents = 'none';
    document.documentElement.appendChild(node);
  });
}

async function revealTooltip(page: Page, mark: Locator) {
  const box = await mark.boundingBox();
  if (!box) return;
  await page.evaluate(({ x, y, h }) => {
    const node = document.querySelector('[data-demo-tip]');
    if (!(node instanceof HTMLElement)) return;
    node.querySelectorAll('*').forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.color = '#f5f6f8';
      child.style.background = 'transparent';
      child.style.position = 'static';
    });
    node.style.visibility = 'visible';
    node.style.width = '420px';
    node.style.left = '48px';
    node.style.top = '168px';
    node.style.transform = 'none';
    node.style.background = '#17191e';
    node.style.color = '#f5f6f8';
    node.style.padding = '16px 18px';
    node.style.borderRadius = '12px';
    node.style.border = '1px solid #c4a15a';
    node.style.boxShadow = '0 18px 50px rgba(0,0,0,.45)';
    node.style.fontSize = '15px';
    node.style.lineHeight = '1.45';
    node.style.maxHeight = '240px';
    node.style.overflow = 'auto';
    void x;
    void y;
    void h;
  }, { x: box.x, y: box.y, h: box.height });
}

async function zoomOut(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-demo-tip]').forEach((node) => node.remove());
    const root = document.body;
    root.style.transformOrigin = '0 0';
    root.style.transition = 'transform 700ms cubic-bezier(0.22, 0.82, 0.24, 1)';
    root.style.transform = 'none';
  });
  await page.waitForTimeout(760);
  await page.evaluate(() => {
    const root = document.body;
    root.style.transition = '';
    root.style.transform = '';
    document.documentElement.style.overflow = '';
    document.querySelectorAll('.app-v3-header').forEach((node) => {
      if (node instanceof HTMLElement) node.style.removeProperty('visibility');
    });
  });
}

async function openRecording(browser: Browser, testInfo: TestInfo, storageState: BrowserContextOptions['storageState']) {
  const context = await browser.newContext({
    storageState,
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: testInfo.outputPath('video'), size: { width: 1600, height: 900 } },
    colorScheme: 'dark',
  });
  const openedAt = Date.now();
  const page = await context.newPage();
  await page.addInitScript(() => {
    const apply = () => {
      if (document.getElementById('demo-quiet')) return;
      const style = document.createElement('style');
      style.id = 'demo-quiet';
      style.textContent = 'nextjs-portal, [data-nextjs-dev-tools-button], [data-testid="ai-budget"] { display: none !important; }';
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
    else apply();
    const hide = () => document.querySelectorAll('nextjs-portal').forEach((node) => node.remove());
    new MutationObserver(hide).observe(document.documentElement, { childList: true, subtree: true });
  });
  return { page, openedAt };
}

async function finishRecording(page: Page, testInfo: TestInfo, name: string, segments: Array<[number, number]> = []) {
  const video = page.video();
  await page.context().close();
  if (!video) return;
  const dest = resolve(demoDir(), name);
  const kept = segments.filter(([start, end]) => end - start > 0.4);
  if (!kept.length) {
    await video.saveAs(dest);
    return;
  }
  const raw = dest.replace(/\.webm$/, '.raw.webm');
  await video.saveAs(raw);
  await trimSegments(raw, dest, kept);
  void testInfo;
}

function remapBeats(beats: Array<{ time: number; text: string }>, segments: Array<[number, number]>) {
  let cursor = 0;
  const mapped: Array<{ time: number; text: string }> = [];
  for (const [start, end] of segments) {
    if (end - start <= 0.4) continue;
    for (const beat of beats) {
      if (beat.time >= start && beat.time < end) mapped.push({ time: cursor + (beat.time - start), text: beat.text });
    }
    cursor += end - start;
  }
  return { beats: mapped, end: cursor };
}

function ffmpegBin(): string {
  const candidates = [
    resolve(process.env.TEMP || '', 'jb-ffmpeg/node_modules/ffmpeg-static'),
    resolve(__dirname, '../../../node_modules/ffmpeg-static'),
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate) as string;
    } catch {
      // try the next install location
    }
  }
  throw new Error('ffmpeg-static is not installed');
}

async function trimSegments(raw: string, dest: string, segments: Array<[number, number]>) {
  const { spawnSync } = require('child_process') as typeof import('child_process');
  const { unlinkSync } = require('fs') as typeof import('fs');
  const ffmpeg = ffmpegBin();
  const filters = segments.map(([start, end], index) => `[0:v]trim=start=${start.toFixed(3)}:end=${end.toFixed(3)},setpts=PTS-STARTPTS[v${index}]`);
  const concat = `${segments.map((_, index) => `[v${index}]`).join('')}concat=n=${segments.length}:v=1:a=0[out]`;
  const result = spawnSync(ffmpeg, [
    '-y', '-i', raw,
    '-filter_complex', `${filters.join(';')};${concat}`,
    '-map', '[out]', '-c:v', 'libvpx', '-b:v', '1100k', '-an', dest,
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Could not trim ${dest}`);
  unlinkSync(raw);
}

function demoDir() {
  const dir = resolve(__dirname, '../../../frontend/public/demo');
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveFrame(page: Page, name: string) {
  await page.screenshot({ path: resolve(demoDir(), name), type: 'jpeg', quality: 86 });
}

function writeCaptions(name: string, beats: Array<{ time: number; text: string }>, end: number) {
  const stamp = (seconds: number) => {
    const whole = Math.max(0, seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = Math.floor(whole % 60);
    const millis = Math.floor((whole - Math.floor(whole)) * 1000);
    const pad = (value: number, size = 2) => String(value).padStart(size, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`;
  };
  const cues = beats.map((beat, index) => {
    const stop = index + 1 < beats.length ? beats[index + 1].time : Math.max(end, beat.time + 1.5);
    return `${stamp(beat.time)} --> ${stamp(stop)}\n${beat.text}`;
  });
  writeFileSync(resolve(demoDir(), name), `WEBVTT\n\n${cues.join('\n\n')}\n`);
}

async function resumePdf(browser: Browser) {
  const page = await browser.newPage();
  await page.setContent(RESUME_HTML, { waitUntil: 'load' });
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.55in', bottom: '0.5in', left: '0.65in', right: '0.65in' },
  });
  await page.close();
  return pdf;
}

async function ensureDemoUser() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase admin credentials are missing');
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
  const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Maya Ellison', role: 'ROLE_CANDIDATE' },
    }),
  });
  if (!created.ok && created.status !== 422) {
    throw new Error(`Could not create the demo account (${created.status})`);
  }
  if (!created.ok) {
    const listed = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=200`, { headers });
    const body = await listed.json() as { users?: Array<{ id: string; email?: string }> };
    const existing = body.users?.find((user) => user.email === DEMO_EMAIL);
    if (!existing) throw new Error('Demo account already exists but could not be found');
    const reset = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: TEST_PASSWORD, email_confirm: true }),
    });
    if (!reset.ok) throw new Error(`Could not reset the demo account (${reset.status})`);
  }
  return login(DEMO_EMAIL, TEST_PASSWORD);
}

async function grantDemoCredits(userId: string) {
  if (!userId) throw new Error('Demo profile did not return an id');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing');
  const { MongoClient, ObjectId } = require('../../../backend/node_modules/mongodb');
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const updated = await client.db().collection('ai_budget_accounts').updateOne(
      { ownerType: 'candidate', ownerId: new ObjectId(String(userId)) },
      { $set: { bonusCredits: 2000, bonusPeriodEnd: new Date('2026-12-01T00:00:00.000Z') } },
    );
    if (!updated.matchedCount) throw new Error('Demo budget account was not created');
  } finally {
    await client.close();
  }
}

const RESUME_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin: 0; color: #1c1c1c; font: 11px/1.45 Georgia, "Times New Roman", serif; }
  h1 { font-size: 26px; font-weight: 500; letter-spacing: 0; margin: 0; }
  .contact { color: #444; margin: 4px 0 0; }
  h2 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; margin: 16px 0 6px; border-bottom: 1px solid #222; padding-bottom: 2px; }
  .role { display: flex; justify-content: space-between; gap: 16px; font-weight: 700; }
  .meta { display: flex; justify-content: space-between; color: #333; font-style: italic; }
  ul { margin: 4px 0 0; padding-left: 16px; }
  li { margin: 2px 0; }
  p { margin: 6px 0 0; }
</style></head><body>
  <h1>Maya Ellison</h1>
  <p class="contact">Full-Stack Software Engineer · Toronto, ON · 416-555-0148 · maya.ellison@example.com</p>
  <h2>Summary</h2>
  <p>Software engineer who builds TypeScript and React products for schools and finance teams. Ships Node APIs, PostgreSQL data models, and AWS deployments, and keeps the interface accessible.</p>
  <h2>Experience</h2>
  <div class="role"><span>Software Engineer, Northline</span><span>Jan 2023 – Present</span></div>
  <div class="meta"><span>Toronto, ON</span><span></span></div>
  <ul>
    <li>Built a multi-tenant course platform in React and Node for school operators.</li>
    <li>Designed PostgreSQL schemas and APIs used by 40 schools.</li>
    <li>Deployed services on AWS with Docker and Kubernetes, cutting releases from weekly to daily.</li>
  </ul>
  <div class="role" style="margin-top:8px"><span>Full-Stack Developer, Harbor &amp; Co.</span><span>Jun 2021 – Dec 2022</span></div>
  <div class="meta"><span>Toronto, ON</span><span></span></div>
  <ul>
    <li>Led the customer billing UI in React and a Node payments API.</li>
    <li>Added accessible forms and keyboard flows used by finance staff every day.</li>
  </ul>
  <h2>Skills</h2>
  <p>TypeScript, React, Node.js, PostgreSQL, AWS, Docker, Kubernetes, Accessibility</p>
  <h2>Education</h2>
  <div class="role"><span>BSc Computer Science, University of Toronto</span><span>2017 – 2021</span></div>
</body></html>`;
