import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { FetcherService } from '../ingestion/pipeline/fetcher.service';

export interface JobDescriptionResolution {
  description?: string;
  finalUrl?: string;
  warning?: string;
  links?: string[];
  linksTruncated?: boolean;
}

const FETCH_WARNING =
  'We could not read that job URL. Paste the description to improve résumé tailoring and ATS matching.';
const EMPTY_WARNING =
  'We could not find a job description on that page. Paste the description to improve résumé tailoring and ATS matching.';
const FETCH_OPTIONS = {
  timeoutMs: 8000,
  maxBytes: 1_000_000,
  maxRedirects: 3,
};
export const FETCHED_LINK_CAP = 100;
const BLOCKED_PATH = new Set([
  'login',
  'signin',
  'signup',
  'register',
  'account',
  'privacy',
  'terms',
  'cookies',
  'cart',
  'wp-admin',
  'wp-login',
]);

/**
 * Resolves candidate-supplied job URLs through the ingestion subsystem's
 * SSRF-safe fetcher. A job page is optional context, so every failure is data
 * returned to the caller rather than an exception that blocks a résumé.
 */
@Injectable()
export class JobDescriptionResolverService {
  constructor(private readonly fetcher: FetcherService) {}

  async resolve(jobUrl: string): Promise<JobDescriptionResolution> {
    const page = await this.fetch(jobUrl);
    if (!page.ok) {
      return {
        finalUrl: page.finalUrl,
        warning: FETCH_WARNING,
      };
    }

    const links = this.sameHostLinks(page.body, page.finalUrl);
    const description = this.extract(page.body);
    if (description) return { description, finalUrl: page.finalUrl, ...links };

    // shortcut: one same-origin script; follow more chunks when a real page splits its copy
    const scriptUrl = this.sameOriginScript(page.body, page.finalUrl);
    if (!scriptUrl) return { finalUrl: page.finalUrl, warning: EMPTY_WARNING, ...links };
    const script = await this.fetch(scriptUrl);
    const fromScript = script.ok ? this.scriptCopy(script.body) : undefined;
    if (!fromScript) return { finalUrl: page.finalUrl, warning: EMPTY_WARNING, ...links };
    return { description: fromScript, finalUrl: page.finalUrl, ...links };
  }

  /**
   * shortcut: one hop, 100 links under the named path; a second hop only when a real page keeps its copy off that next page.
   */
  private sameHostLinks(
    html: string,
    pageUrl: string,
  ): { links?: string[]; linksTruncated?: boolean } {
    let page: URL;
    try {
      page = new URL(pageUrl);
    } catch {
      return {};
    }
    const pagePath = new URL(this.withoutTracking(page)).pathname;
    const $ = cheerio.load(html);
    const main = $('main a[href], article a[href], [role="main"] a[href]');
    const anchors = main.length
      ? main.toArray()
      : $('a[href]')
          .toArray()
          .filter((element) => $(element).closest('nav, header, footer').length === 0);
    const seen = new Set<string>();
    const eligible: string[] = [];
    for (const element of anchors) {
      const cleaned = this.eligibleLink($(element).attr('href'), page, pagePath);
      if (!cleaned || seen.has(cleaned)) continue;
      seen.add(cleaned);
      eligible.push(cleaned);
    }
    const nested = eligible.filter((href) =>
      this.isUnder(pagePath, new URL(href).pathname),
    );
    const nestedChosen = this.shallowest(nested);
    const siblings = this.shallowest(
      eligible.filter((href) => !nested.includes(href)),
    ).filter((href) => !this.underAny(href, nestedChosen));
    const chosen = nested.length ? [...nestedChosen, ...siblings] : this.shallowest(eligible);
    const links = chosen.slice(0, FETCHED_LINK_CAP);
    if (!links.length) return {};
    return chosen.length > FETCHED_LINK_CAP
      ? { links, linksTruncated: true }
      : { links };
  }

  private eligibleLink(
    href: string | undefined,
    page: URL,
    pagePath: string,
  ): string | undefined {
    if (!href) return;
    let url: URL;
    try {
      url = new URL(href, page);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (this.siteHost(url) !== this.siteHost(page)) return;
    const cleaned = this.withoutTracking(url);
    const parsed = new URL(cleaned);
    if (parsed.pathname === pagePath) return;
    if (this.blockedPath(parsed.pathname) || this.filePath(parsed.pathname)) return;
    return cleaned;
  }

  private isUnder(pagePath: string, pathname: string): boolean {
    if (pagePath === '/') {
      return pathname.split('/').filter(Boolean).length === 1;
    }
    const base = pagePath.endsWith('/') ? pagePath : `${pagePath}/`;
    return pathname.startsWith(base);
  }

  private underAny(href: string, parents: string[]): boolean {
    const path = new URL(href).pathname;
    return parents.some((parent) => {
      const base = new URL(parent).pathname;
      const prefix = base.endsWith('/') ? base : `${base}/`;
      return path.startsWith(prefix);
    });
  }

  private shallowest(urls: string[]): string[] {
    const paths = urls.map((href) => new URL(href).pathname);
    return urls.filter((href) => {
      const path = new URL(href).pathname;
      return !paths.some(
        (other) => other !== path && path.startsWith(other.endsWith('/') ? other : `${other}/`),
      );
    });
  }

  private siteHost(url: URL): string {
    return url.hostname.replace(/^www\./i, '').toLowerCase();
  }

  private withoutTracking(url: URL): string {
    const next = new URL(url.href);
    next.hash = '';
    const kept = new URLSearchParams();
    for (const [key, value] of next.searchParams) {
      if (key === 'gclid' || key === 'fbclid' || key.toLowerCase().startsWith('utm_')) continue;
      kept.append(key, value);
    }
    next.search = kept.toString() ? `?${kept.toString()}` : '';
    return next.toString();
  }

  private blockedPath(pathname: string): boolean {
    return pathname.split('/').some((part) => BLOCKED_PATH.has(part.toLowerCase()));
  }

  private filePath(pathname: string): boolean {
    return /\.(pdf|zip|png|jpe?g|gif|svg|webp|css|js|mp4|webm|xml)$/i.test(pathname);
  }

  private async fetch(
    url: string,
  ): Promise<
    | { ok: true; body: string; finalUrl: string }
    | { ok: false; finalUrl: string }
  > {
    try {
      const result = await this.fetcher.fetch(url, FETCH_OPTIONS);
      if (!result.ok) return { ok: false, finalUrl: result.finalUrl || url };
      return { ok: true, body: result.body, finalUrl: result.finalUrl };
    } catch {
      return { ok: false, finalUrl: url };
    }
  }

  private sameOriginScript(html: string, pageUrl: string): string | undefined {
    let page: URL;
    try {
      page = new URL(pageUrl);
    } catch {
      return;
    }
    const $ = cheerio.load(html);
    let found: string | undefined;
    $('script[src]').each((_, element) => {
      if (found) return;
      const src = $(element).attr('src');
      if (!src) return;
      let url: URL;
      try {
        url = new URL(src, page);
      } catch {
        return;
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      if (url.origin !== page.origin) return;
      if (!url.pathname.endsWith('.js')) return;
      found = url.toString();
    });
    return found;
  }

  private scriptCopy(source: string): string | undefined {
    const lines: string[] = [];
    const seen = new Set<string>();
    const props =
      /(?:title|period|description|children|name)\s*:\s*"((?:\\.|[^"\\])*)"/g;
    for (const match of source.matchAll(props)) {
      const text = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .trim();
      if (text.length < 8 || seen.has(text)) continue;
      seen.add(text);
      lines.push(text);
    }
    const joined = lines.join('\n').slice(0, 20_000);
    return this.useful(joined) ? joined : undefined;
  }

  private extract(body: string): string | undefined {
    const $ = cheerio.load(body);
    const posting = this.findJobPosting($);
    if (posting) {
      const title = this.plainText(String(posting.title || ''));
      const description = this.plainText(String(posting.description || ''));
      const combined = [title, description].filter(Boolean).join('\n\n');
      if (this.useful(combined)) return combined.slice(0, 20_000);
    }

    $('script, style, noscript, nav, header, footer, aside, form').remove();
    const root = $('main, article, [role="main"], .job-description, #job-description').first();
    const visible = this.plainText((root.length ? root : $('body')).html() || '');
    return this.useful(visible) ? visible.slice(0, 20_000) : undefined;
  }

  private findJobPosting($: cheerio.CheerioAPI): Record<string, any> | undefined {
    let found: Record<string, any> | undefined;
    $('script[type="application/ld+json"]').each((_, element) => {
      if (found) return;
      try {
        const parsed = JSON.parse($(element).text());
        this.visitJsonLd(parsed, (candidate) => {
          if (!found) found = candidate;
        });
      } catch {
        // Malformed structured data is common; visible text remains available.
      }
    });
    return found;
  }

  private visitJsonLd(
    value: unknown,
    accept: (posting: Record<string, any>) => void,
  ): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.visitJsonLd(item, accept));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, any>;
    const types = Array.isArray(object['@type'])
      ? object['@type']
      : [object['@type']];
    if (types.includes('JobPosting')) accept(object);
    if (object['@graph']) this.visitJsonLd(object['@graph'], accept);
  }

  private plainText(html: string): string {
    const $ = cheerio.load(`<div id="jobocate-root">${html}</div>`);
    $('#jobocate-root br').replaceWith('\n');
    $('#jobocate-root p, #jobocate-root li, #jobocate-root h1, #jobocate-root h2, #jobocate-root h3')
      .each((_, element) => {
        $(element).append('\n');
      });
    return $('#jobocate-root')
      .text()
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private useful(text: string): boolean {
    return text.replace(/\s/g, '').length >= 40;
  }
}
