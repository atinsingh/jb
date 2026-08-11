import { corsOrigins } from './cors-origins';

/**
 * CORS is a security boundary, so the rules that keep it narrow are worth
 * pinning: extra origins are opt-in, blanks never widen the allowlist, and
 * FRONTEND_URL is never parsed as a list (a dozen call sites build real URLs
 * from it and would emit a comma-joined string if it were).
 */
describe('corsOrigins', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('allows the frontend origin by default', () => {
    process.env.FRONTEND_URL = 'https://app.jobocate.com';
    delete process.env.CORS_EXTRA_ORIGINS;

    expect(corsOrigins()).toEqual(['https://app.jobocate.com']);
  });

  it('falls back to localhost when nothing is configured', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.CORS_EXTRA_ORIGINS;

    expect(corsOrigins()).toEqual(['http://localhost:3000']);
  });

  it('adds extra origins for machines where another project holds the default port', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.CORS_EXTRA_ORIGINS = 'http://localhost:3001';

    expect(corsOrigins()).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('accepts several extra origins and trims whitespace', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.CORS_EXTRA_ORIGINS = ' http://localhost:3001 , http://127.0.0.1:3001 ';

    expect(corsOrigins()).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ]);
  });

  it('never widens the allowlist from blanks or trailing commas', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.CORS_EXTRA_ORIGINS = ',,  ,';

    expect(corsOrigins()).toEqual(['http://localhost:3000']);
  });

  it('does not list the same origin twice', () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.CORS_EXTRA_ORIGINS = 'http://localhost:3000,http://localhost:3001';

    expect(corsOrigins()).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('treats FRONTEND_URL as a single URL, never as a list', () => {
    // If this ever splits, password-reset links become "a,b/reset-password".
    process.env.FRONTEND_URL = 'http://localhost:3000,http://evil.example';
    delete process.env.CORS_EXTRA_ORIGINS;

    expect(corsOrigins()).toEqual(['http://localhost:3000,http://evil.example']);
  });
});
