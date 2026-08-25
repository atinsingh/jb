/* LOCAL VISUAL CHECK HARNESS — not shipped, not imported by the app.
   Serves fixture JSON for the API so each redesigned screen can be rendered
   and eyeballed without standing up Mongo + the Nest backend. Shapes mirror
   the real DTOs the services already parse. */
const puppeteer = require('puppeteer');
const OUT = '/private/tmp/claude-501/-Users-perfectumai-products-jobocate/5b455493-a02a-412d-b73d-132ac3dbf9c6/scratchpad';
const BASE = 'http://localhost:3001';

const job = (title, company, location, min, max, score, days) => ({
  _id: `${company}-${title}`.replace(/\s/g, ''),
  title, company, location,
  salaryMin: min * 1000, salaryMax: max * 1000,
  type: 'Full-time', workplaceType: /Remote/.test(location) ? 'REMOTE' : 'HYBRID',
  scrapedAt: new Date(Date.now() - days * 864e5).toISOString(),
});
const match = (t, c, loc, mn, mx, score, days, skills, missing) => ({
  _id: `m-${c}`, jobId: `${c}-${t}`.replace(/\s/g, ''), matchScore: score,
  job: job(t, c, loc, mn, mx, score, days),
  matchedSkills: skills, missingSkills: missing, isInterested: false,
});
const MATCHES = [
  match('Staff Product Designer', 'Northwind', 'Remote, US', 170, 200, 94, 2, ['Design systems', 'Prototyping', 'Front-end literacy'], []),
  match('Sr Product Designer', 'Meridian', 'Remote, US', 160, 185, 92, 5, ['Research', 'Systems', 'Prototyping'], ['Motion design']),
  match('Product Designer, Platform', 'Aster Health', 'Boston, hybrid', 150, 175, 91, 0, ['Platform', 'Design systems'], ['Healthcare domain']),
  match('Senior Designer, Growth', 'Lumen', 'Remote, EU', 120, 145, 88, 4, ['Activation', 'Experimentation'], []),
  match('Design Systems Lead', 'Verity', 'New York, onsite', 165, 190, 85, 7, ['Systems'], ['User research']),
];
const app_ = (title, company, status, score, hours) => ({
  _id: `a-${company}-${status}`, status, matchScore: score,
  companyName: company, role: title, title,
  updatedAt: new Date(Date.now() - hours * 36e5).toISOString(),
  appliedAt: new Date(Date.now() - hours * 36e5).toISOString(),
});
const APPS = [
  app_('Staff Product Designer', 'Northwind', 'awaiting_approval', 94, 0.05),
  app_('Sr Product Designer', 'Meridian', 'interviewed', 92, 0.25),
  app_('Product Designer, Platform', 'Aster Health', 'reviewing', 91, 3),
  app_('Design Lead', 'Juniper', 'accepted', 89, 1),
  app_('Senior Designer, Growth', 'Lumen', 'submitted', 88, 24),
  app_('Frontend Engineer', 'Cobalt Labs', 'interviewed', 86, 5),
  app_('Design Systems Lead', 'Verity', 'submitted', 85, 48),
  app_('Senior Designer', 'Talloak', 'interviewed', 84, 26),
  app_('Product Designer', 'Fieldstone', 'reviewing', 82, 72),
  app_('UX Engineer', 'Harbor', 'submitted', 79, 144),
  app_('Motion Designer', 'Kestrel', 'needs_human', 77, 8),
  app_('Brand Designer', 'Alder', 'rejected', 71, 200),
];
const ROUTES = [
  [/matching\/matches/, { matches: MATCHES, total: MATCHES.length }],
  [/matching\/recommendations/, { recommendations: MATCHES }],
  [/matching\/eligible-jobs/, { jobs: MATCHES, total: MATCHES.length, candidateCountry: 'US', targetCountries: ['US'] }],
  [/matching\/preview/, { totalJobs: 412 }],
  [/applications\/my-applications/, { applications: APPS, total: APPS.length }],
  [/users\/preferences/, { preferences: { titles: ['Senior Product Designer'], locations: ['Remote (US)'], minSalary: 150000 } }],
  [/users\/profile/, {}],
  [/resume\/data|resumes/, { resumes: [{ _id: 'r1', title: 'Product Designer — 2026', atsScore: 82 }] }],
  [/employer\/applicants\/stats/, { total: 248, applied: 64, screening: 96, interview: 31, offer: 7, hired: 4 }],
  [/employer\/jobs/, { jobs: [
      { _id: 'j1', title: 'Staff Product Designer', location: 'Remote, US', type: 'Full-time', status: 'active', applicantsCount: 64 },
      { _id: 'j2', title: 'Senior Backend Engineer', location: 'Austin, hybrid', type: 'Full-time', status: 'active', applicantsCount: 112 },
      { _id: 'j3', title: 'Data Analyst', location: 'Remote, EU', type: 'Full-time', status: 'active', applicantsCount: 48 },
    ] }],
  [/employer\/interviews/, { interviews: [
      { _id: 'i1', scheduledAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(), candidateName: 'Candidate · A.R.', role: 'Staff Product Designer', round: 'Panel', type: 'Video' },
      { _id: 'i2', scheduledAt: new Date(new Date().setHours(13, 30, 0, 0)).toISOString(), candidateName: 'Candidate · M.K.', role: 'Senior Backend Engineer', round: 'Technical', type: 'Video' },
      { _id: 'i3', scheduledAt: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(), candidateName: 'Candidate · J.T.', role: 'Staff Product Designer', round: 'Hiring manager', type: 'Onsite' },
    ] }],
  [/employer\/company/, { company: { name: 'Northwind' } }],
];

const PAGES = [
  ['dashboard', '/app/dashboard'], ['matches', '/app/matches'], ['tracker', '/app/tracker'],
  ['tracker-table', '/app/tracker'], ['resume', '/app/resume'],
  ['employer', '/employer/dashboard'], ['onboarding', '/app/onboarding'],
];

(async () => {
  const b = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox'],
  });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 950 });
  await p.setRequestInterception(true);
  p.on('request', (req) => {
    const u = req.url();
    if (/\/api\//.test(u)) {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      };
      if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors, body: '' });
      const hit = ROUTES.find(([re]) => re.test(u));
      return req.respond({
        status: 200,
        contentType: 'application/json',
        headers: cors,
        body: JSON.stringify(hit ? hit[1] : {}),
      });
    }
    req.continue();
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 220)));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 180)); });

  await p.goto(BASE + '/app/login', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    localStorage.setItem('authToken', 'local-visual-check');
    localStorage.setItem('user', JSON.stringify({ _id: 'u1', name: 'Dharmendra Kumar', email: 'dk@email.com', role: 'ROLE_USER', plan: 'Pro' }));
  });

  for (const [name, path] of PAGES) {
    await p.evaluate((emp) => {
      localStorage.setItem('user', JSON.stringify(
        emp
          ? { _id: 'e1', name: 'Dana Whitfield', email: 'dana@northwind.example', role: 'ROLE_EMPLOYER', plan: 'Growth' }
          : { _id: 'u1', name: 'Dharmendra Kumar', email: 'dk@email.com', role: 'ROLE_USER', plan: 'Pro' },
      ));
    }, name === 'employer');
    try {
      await p.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
    } catch (e) { console.log(name, 'nav:', e.message.slice(0, 80)); }
    await new Promise((r) => setTimeout(r, 2200));
    if (name === 'tracker-table') {
      await p.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Table');
        if (b) b.click();
      });
      await new Promise((r) => setTimeout(r, 700));
    }
    await p.screenshot({ path: `${OUT}/${name}.png` });
    console.log(name.padEnd(14), '->', p.url().replace(BASE, ''));
  }
  if (errs.length) console.log('\nERRORS:\n' + [...new Set(errs)].slice(0, 8).join('\n'));
  await b.close();
})();
