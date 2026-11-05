import { FetcherService } from '../../ingestion/pipeline/fetcher.service';
import { JobDescriptionResolverService } from '../job-description-resolver.service';

describe('JobDescriptionResolverService', () => {
  const fetcher = { fetch: jest.fn() } as unknown as FetcherService;
  let service: JobDescriptionResolverService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JobDescriptionResolverService(fetcher);
  });

  it('prefers the structured JobPosting description and strips its markup', async () => {
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html; charset=utf-8',
      finalUrl: 'https://jobs.example.com/platform-engineer',
      body: `
        <html><body>
          <main>Generic careers navigation</main>
          <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Platform Engineer",
              "description": "<p>Build Kubernetes platforms.</p><ul><li>Terraform</li></ul>"
            }
          </script>
        </body></html>`,
    });

    await expect(
      service.resolve('https://jobs.example.com/platform-engineer'),
    ).resolves.toEqual({
      description: 'Platform Engineer\n\nBuild Kubernetes platforms.\nTerraform',
      finalUrl: 'https://jobs.example.com/platform-engineer',
    });
    expect(fetcher.fetch).toHaveBeenCalledWith(
      'https://jobs.example.com/platform-engineer',
      { timeoutMs: 8000, maxBytes: 1_000_000, maxRedirects: 3 },
    );
  });

  it('falls back to the visible job page content', async () => {
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      finalUrl: 'https://jobs.example.com/role',
      body: `
        <html><head><title>Role</title><style>.x{}</style></head>
          <body><nav>Jobs Home</nav><main><h1>Cloud Engineer</h1><p>Operate AWS infrastructure and Terraform.</p><p>Five years of experience.</p></main><script>ignore()</script></body>
        </html>`,
    });

    const result = await service.resolve('https://jobs.example.com/role');

    expect(result.description).toContain('Cloud Engineer');
    expect(result.description).toContain('Operate AWS infrastructure and Terraform.');
    expect(result.description).not.toContain('ignore()');
    expect(result.description).not.toContain('Jobs Home');
  });

  it('returns a non-fatal warning when the URL cannot be fetched', async () => {
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      finalUrl: 'https://jobs.example.com/protected',
      error: 'HTTP 403',
      body: '',
    });

    await expect(
      service.resolve('https://jobs.example.com/protected'),
    ).resolves.toEqual({
      finalUrl: 'https://jobs.example.com/protected',
      warning:
        'We could not read that job URL. Paste the description to improve résumé tailoring and ATS matching.',
    });
  });

  it('returns a non-fatal warning when the fetcher throws unexpectedly', async () => {
    (fetcher.fetch as jest.Mock).mockRejectedValue(new Error('socket closed'));

    await expect(
      service.resolve('https://jobs.example.com/unavailable'),
    ).resolves.toEqual({
      finalUrl: 'https://jobs.example.com/unavailable',
      warning:
        'We could not read that job URL. Paste the description to improve résumé tailoring and ATS matching.',
    });
  });

  it('reads copy from the same-origin script when the HTML shell is empty', async () => {
    (fetcher.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        contentType: 'text/html',
        finalUrl: 'https://www.harkitsinghchhabra.co/',
        body: `
          <html><head><title>Harkit Singh Chhabra - Personal Portfolio</title>
            <script type="module" src="/assets/index-abc.js"></script>
          </head>
          <body><div id="root"></div>
            <script src="https://unpkg.com/ionicons.js"></script>
          </body></html>`,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        contentType: 'application/javascript',
        finalUrl: 'https://www.harkitsinghchhabra.co/assets/index-abc.js',
        body: 'children:"I am a software engineer based in Toronto.",title:"Software Engineer, Pragra.io",period:"Jan 2026 — Present",description:"Built a multi-tenant SaaS LMS."',
      });

    const result = await service.resolve('https://www.harkitsinghchhabra.co/');

    expect(result.warning).toBeUndefined();
    expect(result.description).toContain('Software Engineer, Pragra.io');
    expect(result.description).toContain('Jan 2026 — Present');
    expect(result.description).toContain('Built a multi-tenant SaaS LMS.');
    expect(result.description).toContain('software engineer based in Toronto');
    expect(fetcher.fetch).toHaveBeenLastCalledWith(
      'https://www.harkitsinghchhabra.co/assets/index-abc.js',
      { timeoutMs: 8000, maxBytes: 1_000_000, maxRedirects: 3 },
    );
  });

  it('follows pages nested under the named path and skips the site header', async () => {
    const nested = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota']
      .map((name) => `<a href="/people/ada/${name}">${name}</a>`)
      .join('');
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      finalUrl: 'https://example.com/people/ada',
      body: `
        <html><body>
          <header><a href="/features">Features</a><a href="/explore">Explore</a></header>
          <main>
            <p>This page has enough visible text to describe the person and their work.</p>
            <a href="/other-org">Org</a>
            <a href="/contact">Contact</a>
            <a href="/people/ada/alpha">Alpha</a>
            <a href="/people/ada/alpha/stars">Stars</a>
            ${nested}
          </main>
        </body></html>`,
    });

    const result = await service.resolve('https://example.com/people/ada');

    expect(result.links).toEqual([
      'https://example.com/people/ada/alpha',
      'https://example.com/people/ada/beta',
      'https://example.com/people/ada/gamma',
      'https://example.com/people/ada/delta',
      'https://example.com/people/ada/epsilon',
      'https://example.com/people/ada/zeta',
      'https://example.com/people/ada/eta',
      'https://example.com/people/ada/theta',
      'https://example.com/people/ada/iota',
      'https://example.com/other-org',
      'https://example.com/contact',
    ]);
    expect(result.linksTruncated).toBeUndefined();
    expect(result.links?.join(' ')).not.toMatch(/features|explore|stars/);
  });

  it('prefers top-level pages on a site root and skips the header', async () => {
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      finalUrl: 'https://example.com/',
      body: `
        <html><body>
          <header><a href="/features">Features</a></header>
          <main>
            <p>This page has enough visible text to describe the company and its work.</p>
            <a href="/docs/intro">Intro</a>
            <a href="/about">About</a>
          </main>
        </body></html>`,
    });

    const result = await service.resolve('https://example.com/');

    expect(result.links).toEqual([
      'https://example.com/about',
      'https://example.com/docs/intro',
    ]);
  });

  it('stops after 100 nested pages', async () => {
    const nested = Array.from({ length: 101 }, (_, index) => {
      const name = `p${String(index).padStart(3, '0')}`;
      return `<a href="/people/ada/${name}">${name}</a>`;
    }).join('');
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      finalUrl: 'https://example.com/people/ada',
      body: `<html><body><main><p>This page has enough visible text to describe the person and their work.</p>${nested}</main></body></html>`,
    });

    const result = await service.resolve('https://example.com/people/ada');

    expect(result.links).toHaveLength(100);
    expect(result.links?.[0]).toBe('https://example.com/people/ada/p000');
    expect(result.links?.[99]).toBe('https://example.com/people/ada/p099');
    expect(result.links).not.toContain('https://example.com/people/ada/p100');
    expect(result.linksTruncated).toBe(true);
  });

  it('returns same-host pages and skips junk links when nothing is nested', async () => {
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      finalUrl: 'https://jobs.example.com/role',
      body: `
        <html><body><main>
          <p>This page has enough visible text to describe the role and the team.</p>
          <a href="https://www.jobs.example.com/about?utm_source=newsletter">About</a>
          <a href="/team">Team</a>
          <a href="https://other.example/elsewhere">Elsewhere</a>
          <a href="/privacy">Privacy</a>
          <a href="/files/brief.pdf">PDF</a>
          <a href="/one">One</a>
          <a href="/two">Two</a>
          <a href="/three">Three</a>
          <a href="/role#section">Self</a>
          <a href="/login">Login</a>
        </main></body></html>`,
    });

    const result = await service.resolve('https://jobs.example.com/role');

    expect(result.links).toEqual([
      'https://www.jobs.example.com/about',
      'https://jobs.example.com/team',
      'https://jobs.example.com/one',
      'https://jobs.example.com/two',
      'https://jobs.example.com/three',
    ]);
    expect(result.linksTruncated).toBeUndefined();
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns a non-fatal warning when the page has no useful job text', async () => {
    (fetcher.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      contentType: 'text/html',
      finalUrl: 'https://jobs.example.com/empty',
      body: '<html><body><main>Sign in</main></body></html>',
    });

    const result = await service.resolve('https://jobs.example.com/empty');
    expect(result.description).toBeUndefined();
    expect(result.warning).toMatch(/could not find a job description/i);
  });
});
