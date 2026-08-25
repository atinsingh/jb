const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 950 });
  await p.setRequestInterception(true);
  p.on('request', (r) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    if (/\/api\//.test(r.url())) {
      if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors, body: '' });
      return r.respond({ status: 200, contentType: 'application/json', headers: cors, body: '{}' });
    }
    r.continue();
  });
  await p.goto('http://localhost:3001/app/login', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    localStorage.setItem('authToken', 't');
    localStorage.setItem('user', JSON.stringify({ _id: 'e1', name: 'Dana Whitfield', role: 'ROLE_EMPLOYER' }));
  });
  await p.goto('http://localhost:3001/employer/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const out = await p.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; };
    const root = document.getElementById('emside-root');
    const railHeader = root && root.querySelector('div > div');
    const kids = railHeader ? [...railHeader.children].map((c) => { const r = c.getBoundingClientRect(); return { tag: c.tagName, text: (c.textContent||'').trim().slice(0,20), x: Math.round(r.x), right: Math.round(r.right) }; }) : null;
    const h1 = document.querySelector('h1');
    const main = document.querySelector('main');
    const cs = root ? getComputedStyle(root) : null;
    return {
      sidebarRoot: rect(root),
      sidebarPos: cs && cs.position,
      main: rect(main),
      h1: rect(h1),
      h1text: h1 && h1.textContent,
      header: rect(h1 && h1.parentElement),
      bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
      railHeader: railHeader ? (() => { const r = railHeader.getBoundingClientRect(); return { x: Math.round(r.x), right: Math.round(r.right), scrollW: railHeader.scrollWidth }; })() : null,
      railHeaderKids: kids,
    };
  });
  console.log(JSON.stringify(out, null, 2));
  await b.close();
})();
