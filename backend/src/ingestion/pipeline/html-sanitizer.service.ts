import { Injectable } from '@nestjs/common';
// import-equals (not `import x from`): this repo's tsconfig has no esModuleInterop,
// so a default import of this CommonJS `export =` package resolves to `.default`
// (undefined) at runtime. import-equals binds the module's callable export and its
// statics (simpleTransform, IOptions) correctly.
import sanitizeHtml = require('sanitize-html');

/**
 * Sanitizes all imported HTML (spec §15) to prevent stored XSS from external job
 * descriptions. Allows a conservative subset of formatting tags; strips scripts,
 * styles, iframes, event handlers, and javascript: URLs. Also exposes a plain-text
 * extractor used for fingerprinting and short descriptions.
 */
@Injectable()
export class HtmlSanitizerService {
  private static readonly OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
      'p',
      'br',
      'b',
      'strong',
      'i',
      'em',
      'u',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'a',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
      'hr',
      'pre',
      'code',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },
    // Only safe link protocols; blocks javascript:, data:, etc.
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { a: ['http', 'https', 'mailto'] },
    disallowedTagsMode: 'discard',
    // Force external links to be safe.
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      }),
    },
  };

  /** Returns sanitized HTML safe to store and render. */
  sanitize(html: string | undefined | null): string {
    if (!html) return '';
    return sanitizeHtml(html, HtmlSanitizerService.OPTIONS);
  }

  /** Strips all tags to plain text (for fingerprints, short descriptions). */
  toPlainText(html: string | undefined | null): string {
    if (!html) return '';
    const stripped = sanitizeHtml(html, {
      allowedTags: [],
      allowedAttributes: {},
    });
    return stripped
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
