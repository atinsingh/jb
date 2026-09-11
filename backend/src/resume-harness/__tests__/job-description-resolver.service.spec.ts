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
