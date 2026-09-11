import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { FetcherService } from '../ingestion/pipeline/fetcher.service';

export interface JobDescriptionResolution {
  description?: string;
  finalUrl?: string;
  warning?: string;
}

const FETCH_WARNING =
  'We could not read that job URL. Paste the description to improve résumé tailoring and ATS matching.';
const EMPTY_WARNING =
  'We could not find a job description on that page. Paste the description to improve résumé tailoring and ATS matching.';

/**
 * Resolves candidate-supplied job URLs through the ingestion subsystem's
 * SSRF-safe fetcher. A job page is optional context, so every failure is data
 * returned to the caller rather than an exception that blocks a résumé.
 */
@Injectable()
export class JobDescriptionResolverService {
  constructor(private readonly fetcher: FetcherService) {}

  async resolve(jobUrl: string): Promise<JobDescriptionResolution> {
    let result;
    try {
      result = await this.fetcher.fetch(jobUrl, {
        timeoutMs: 8000,
        maxBytes: 1_000_000,
        maxRedirects: 3,
      });
    } catch {
      return { finalUrl: jobUrl, warning: FETCH_WARNING };
    }
    if (!result.ok) {
      return { finalUrl: result.finalUrl || jobUrl, warning: FETCH_WARNING };
    }

    const description = this.extract(result.body);
    if (!description) {
      return { finalUrl: result.finalUrl, warning: EMPTY_WARNING };
    }
    return { description, finalUrl: result.finalUrl };
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
