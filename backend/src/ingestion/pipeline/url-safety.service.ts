import { Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
  resolvedIps?: string[];
}

/**
 * SSRF defence for the ingestion fetcher (spec §15).
 *
 * Reusable, dependency-free URL validator. It (a) enforces a protocol allowlist,
 * (b) resolves the hostname via DNS and (c) rejects the request if ANY resolved
 * address is loopback / private / link-local / cloud-metadata / reserved. The
 * fetcher calls `assertSafe` for the initial URL AND for every redirect target,
 * because a public URL can 3xx-redirect to 169.254.169.254.
 *
 * DNS-rebinding note: we resolve here and the fetcher pins the connection to a
 * validated IP (see fetcher.service.ts) so the value checked is the value used.
 */
@Injectable()
export class UrlSafetyService {
  private static readonly ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

  /** Parse + protocol check only (no DNS). Cheap pre-filter. */
  parseAndCheckProtocol(rawUrl: string): { url?: URL; error?: string } {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { error: 'malformed URL' };
    }
    if (!UrlSafetyService.ALLOWED_PROTOCOLS.has(url.protocol)) {
      return { error: `protocol not allowed: ${url.protocol}` };
    }
    if (!url.hostname) {
      return { error: 'missing hostname' };
    }
    return { url };
  }

  /**
   * Full validation incl. DNS resolution. Returns every resolved IP so the
   * caller can pin the socket to a checked address.
   */
  async check(rawUrl: string): Promise<UrlSafetyResult> {
    const { url, error } = this.parseAndCheckProtocol(rawUrl);
    if (error || !url) {
      return { safe: false, reason: error };
    }

    const host = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

    // Reject obvious internal names outright.
    const lowered = host.toLowerCase();
    if (
      lowered === 'localhost' ||
      lowered.endsWith('.localhost') ||
      lowered.endsWith('.internal') ||
      lowered.endsWith('.local') ||
      lowered === 'metadata.google.internal'
    ) {
      return { safe: false, reason: `blocked host: ${host}` };
    }

    // Collect candidate IPs: either the literal, or DNS results.
    let ips: string[];
    if (isIP(host)) {
      ips = [host];
    } else {
      try {
        const records = await dns.lookup(host, { all: true });
        ips = records.map((r) => r.address);
      } catch {
        return { safe: false, reason: `DNS resolution failed for ${host}` };
      }
      if (!ips.length) {
        return { safe: false, reason: `no A/AAAA records for ${host}` };
      }
    }

    for (const ip of ips) {
      const blocked = this.isBlockedIp(ip);
      if (blocked) {
        return {
          safe: false,
          reason: `blocked address ${ip} (${blocked})`,
          resolvedIps: ips,
        };
      }
    }

    return { safe: true, resolvedIps: ips };
  }

  /** Throwing convenience wrapper. */
  async assertSafe(rawUrl: string): Promise<string[]> {
    const result = await this.check(rawUrl);
    if (!result.safe) {
      throw new Error(`SSRF blocked: ${result.reason}`);
    }
    return result.resolvedIps || [];
  }

  /**
   * Returns a category string if the IP is private/reserved, else null.
   * Covers IPv4 loopback/private/link-local/reserved and IPv6
   * loopback/unspecified/ULA/link-local + IPv4-mapped IPv6.
   */
  isBlockedIp(ip: string): string | null {
    const kind = isIP(ip);
    if (kind === 4) return this.blockedIpv4(ip);
    if (kind === 6) return this.blockedIpv6(ip);
    return 'not an IP';
  }

  private blockedIpv4(ip: string): string | null {
    const parts = ip.split('.').map((n) => parseInt(n, 10));
    if (
      parts.length !== 4 ||
      parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
    ) {
      return 'invalid ipv4';
    }
    const [a, b] = parts;
    if (a === 0) return 'this-network';
    if (a === 10) return 'private-10/8';
    if (a === 127) return 'loopback';
    if (a === 169 && b === 254) return 'link-local/metadata'; // incl. 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return 'private-172.16/12';
    if (a === 192 && b === 168) return 'private-192.168/16';
    if (a === 192 && b === 0) return 'ietf-protocol-assignments';
    if (a === 100 && b >= 64 && b <= 127) return 'cgn-100.64/10';
    if (a >= 224) return 'multicast/reserved'; // 224.0.0.0+ (multicast + reserved + broadcast)
    return null;
  }

  private blockedIpv6(ip: string): string | null {
    const lower = ip.toLowerCase();
    if (lower === '::1') return 'loopback';
    if (lower === '::') return 'unspecified';
    // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return this.blockedIpv4(mapped[1]);
    if (lower.startsWith('fe80')) return 'link-local';
    if (lower.startsWith('fc') || lower.startsWith('fd')) return 'unique-local';
    if (lower.startsWith('ff')) return 'multicast';
    return null;
  }
}
