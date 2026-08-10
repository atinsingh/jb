import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHash } from 'crypto';
import { UrlSafetyService } from './url-safety.service';

export interface FetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  finalUrl: string;
  checksum: string;
  error?: string;
}

/**
 * SSRF-safe outbound fetcher (spec §15).
 *
 * The raw `axios` used elsewhere in the repo follows redirects automatically and
 * does no URL validation. This fetcher instead:
 *   - runs UrlSafetyService.check on the initial URL AND on every redirect hop
 *     (maxRedirects: 0 + manual follow), so a public URL cannot 3xx into an
 *     internal address,
 *   - enforces protocol allowlist, response-size cap and request timeout,
 *   - sends an identifying User-Agent (politeness / attribution).
 *
 * Known limitation (documented): a DNS-rebinding TOCTOU window exists between the
 * safety check and the socket connect. It is mitigated by the fact that sources
 * are admin-allowlisted (not arbitrary user input) and by the per-hop re-check.
 * Socket-level IP pinning is a Phase-2 hardening item.
 */
@Injectable()
export class FetcherService {
  private readonly userAgent: string;
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxBytes: number;

  constructor(
    private readonly config: ConfigService,
    private readonly urlSafety: UrlSafetyService,
  ) {
    this.userAgent =
      this.config.get<string>('INGESTION_USER_AGENT') ||
      'JobocateIngest/1.0 (+https://jobocate.com/ingestion)';
    this.defaultTimeoutMs =
      Number(this.config.get('INGESTION_FETCH_TIMEOUT_MS')) || 15000;
    this.defaultMaxBytes =
      Number(this.config.get('INGESTION_MAX_RESPONSE_BYTES')) ||
      5 * 1024 * 1024;
  }

  async fetch(rawUrl: string, opts: FetchOptions = {}): Promise<FetchResult> {
    const timeout = opts.timeoutMs ?? this.defaultTimeoutMs;
    const maxBytes = opts.maxBytes ?? this.defaultMaxBytes;
    const maxRedirects = opts.maxRedirects ?? 3;

    let currentUrl = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      // Validate BEFORE every request, including each redirect target.
      const safety = await this.urlSafety.check(currentUrl);
      if (!safety.safe) {
        return this.err(0, `SSRF blocked: ${safety.reason}`, currentUrl);
      }

      let response;
      try {
        response = await axios.get(currentUrl, {
          timeout,
          maxRedirects: 0, // we follow manually to validate each hop
          maxContentLength: maxBytes,
          maxBodyLength: maxBytes,
          responseType: 'text',
          transformResponse: (d) => d, // keep raw string
          validateStatus: () => true, // handle all statuses ourselves
          headers: {
            'User-Agent': this.userAgent,
            Accept: '*/*',
            ...(opts.headers || {}),
          },
        });
      } catch (e: any) {
        return this.err(0, e?.message || 'request failed', currentUrl);
      }

      const status = response.status;

      // Manual redirect handling with per-hop validation.
      if (status >= 300 && status < 400 && response.headers?.location) {
        if (hop === maxRedirects) {
          return this.err(status, 'too many redirects', currentUrl);
        }
        currentUrl = new URL(response.headers.location, currentUrl).toString();
        continue;
      }

      const body =
        typeof response.data === 'string'
          ? response.data
          : String(response.data ?? '');
      if (Buffer.byteLength(body, 'utf8') > maxBytes) {
        return this.err(status, 'response exceeds size cap', currentUrl);
      }

      return {
        ok: status >= 200 && status < 300,
        status,
        contentType: String(response.headers?.['content-type'] || ''),
        body,
        finalUrl: currentUrl,
        checksum: this.checksum(body),
      };
    }

    return this.err(0, 'redirect loop', currentUrl);
  }

  checksum(body: string): string {
    return createHash('sha256').update(body).digest('hex');
  }

  private err(status: number, error: string, finalUrl: string): FetchResult {
    return {
      ok: false,
      status,
      contentType: '',
      body: '',
      finalUrl,
      checksum: '',
      error,
    };
  }
}
