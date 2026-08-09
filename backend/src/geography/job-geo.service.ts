import { Injectable } from '@nestjs/common';
import {
  RemoteScope,
  SponsorshipPolicy,
  WorkplaceType,
  resolveCountry,
} from './geo.constants';

export interface JobGeography {
  country: string | null; // ISO2 primary work country
  region: string | null; // state/province/city label
  city: string | null;
  workplaceType: WorkplaceType;
  remoteScope: RemoteScope;
  eligibleCountries: string[]; // ISO2; empty + GLOBAL means anywhere
  excludedCountries: string[];
  sponsorship: SponsorshipPolicy;
  locationConfidence: number; // 0..1
  needsGeoReview: boolean;
  geoEvidence: string; // short human-readable evidence
}

const GLOBAL_RE = /\b(work from anywhere|anywhere in the world|globally remote|fully remote worldwide|worldwide|world[- ]?wide|any location|any country|global remote|remote[, ]+global)\b/i;
const REMOTE_RE = /\bremote\b|telecommute|work from home|\bwfh\b|distributed/i;
const HYBRID_RE = /\bhybrid\b/i;
const ONSITE_RE = /\bon[- ]?site\b|in[- ]?office|in person/i;

const NO_SPONSOR_RE = /\b(no (visa )?sponsorship|not able to sponsor|unable to sponsor|cannot sponsor|do not (offer|provide) sponsorship|without sponsorship|must (already )?be (legally )?authorized to work|must have work authorization|no relocation or visa)\b/i;
const SPONSOR_RE = /\b(visa sponsorship (is )?available|we sponsor|sponsorship (is )?(available|offered|provided)|will sponsor|h1b sponsorship|relocation and visa)\b/i;

@Injectable()
export class JobGeoService {
  /**
   * Derive structured geography from a scraped/posted job. Deterministic and
   * conservative: "remote" is NEVER treated as global unless the text says so.
   */
  normalize(input: {
    location?: string;
    description?: string;
    title?: string;
    workplaceType?: string;
  }): JobGeography {
    const loc = (input.location || '').trim();
    const desc = (input.description || '').slice(0, 4000); // bound scan cost
    const hay = `${loc}\n${input.title || ''}\n${desc}`;

    // ---- workplace type ----
    const remote = REMOTE_RE.test(loc) || REMOTE_RE.test(input.workplaceType || '') || REMOTE_RE.test(input.title || '');
    let workplaceType: WorkplaceType;
    if (HYBRID_RE.test(hay)) workplaceType = WorkplaceType.HYBRID;
    else if (remote) workplaceType = WorkplaceType.REMOTE;
    else if (ONSITE_RE.test(hay) || loc) workplaceType = WorkplaceType.ONSITE;
    else workplaceType = WorkplaceType.UNSPECIFIED;

    // ---- location split (city / region / country) ----
    const { city, region, country: locCountry } = this.splitLocation(loc);
    // Country can also come from description phrases.
    const country =
      locCountry ||
      this.countryFromPhrases(desc) ||
      (region ? resolveCountry(region) : null);

    // ---- remote scope (conservative) ----
    let remoteScope = RemoteScope.UNSPECIFIED;
    let eligibleCountries: string[] = [];
    let evidence = '';

    if (workplaceType === WorkplaceType.REMOTE) {
      if (GLOBAL_RE.test(hay)) {
        remoteScope = RemoteScope.GLOBAL;
        evidence = 'text indicates global/worldwide remote';
      } else {
        // "remote in <country>" / "<country> remote" / "remote - US"
        const scoped = this.remoteScopedCountry(hay) || country;
        if (scoped) {
          remoteScope = RemoteScope.COUNTRY_ONLY;
          eligibleCountries = [scoped];
          evidence = `remote scoped to ${scoped}`;
        } else {
          remoteScope = RemoteScope.UNSPECIFIED; // do NOT assume global
          evidence = 'remote scope not stated';
        }
      }
    } else if (country) {
      // onsite/hybrid → work must happen in the job's country
      eligibleCountries = [country];
      evidence = `${workplaceType.toLowerCase()} in ${country}`;
    }

    // ---- sponsorship ----
    let sponsorship = SponsorshipPolicy.NOT_SPECIFIED;
    if (NO_SPONSOR_RE.test(desc)) sponsorship = SponsorshipPolicy.NOT_AVAILABLE;
    else if (SPONSOR_RE.test(desc)) sponsorship = SponsorshipPolicy.AVAILABLE;

    // ---- confidence ----
    let confidence = 0.5;
    if (country && workplaceType !== WorkplaceType.UNSPECIFIED) confidence = 0.85;
    if (remoteScope === RemoteScope.GLOBAL || remoteScope === RemoteScope.COUNTRY_ONLY) confidence = Math.max(confidence, 0.75);
    if (workplaceType === WorkplaceType.REMOTE && remoteScope === RemoteScope.UNSPECIFIED) confidence = 0.35;
    if (!country && remoteScope === RemoteScope.UNSPECIFIED) confidence = 0.25;

    const needsGeoReview = confidence < 0.4;

    return {
      country: country || null,
      region: region || null,
      city: city || null,
      workplaceType,
      remoteScope,
      eligibleCountries,
      excludedCountries: [],
      sponsorship,
      locationConfidence: Number(confidence.toFixed(2)),
      needsGeoReview,
      geoEvidence: evidence || (loc ? `parsed "${loc}"` : 'no location data'),
    };
  }

  /**
   * Best-effort company logo URL via unavatar.io (aggregates Clearbit/Google/
   * favicon sources). `fallback=false` returns 4xx when no logo is found, so the
   * frontend's onError swaps in company initials. (Clearbit's own API is dead.)
   */
  deriveLogo(companyName?: string, externalUrl?: string): string {
    const domain = this.companyDomainFromUrl(externalUrl) || this.guessDomain(companyName);
    if (!domain) return '';
    return `https://unavatar.io/${domain}?fallback=false`;
  }

  private guessDomain(name?: string): string {
    const slug = (name || '')
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|co|gmbh)\b/g, '')
      .replace(/[^a-z0-9]/g, '');
    return slug ? `${slug}.com` : '';
  }

  /* ------------------------------------------------------------ helpers */
  private splitLocation(loc: string): { city: string | null; region: string | null; country: string | null } {
    if (!loc || /^remote/i.test(loc) && !loc.includes(',')) {
      // "Remote", "Remote - US"
      const c = resolveCountry(loc);
      return { city: null, region: null, country: c };
    }
    const parts = loc.split(/[•|]/)[0].split(',').map((s) => s.trim()).filter(Boolean);
    let country: string | null = null;
    let region: string | null = null;
    let city: string | null = null;
    // last token often a country or state
    for (let i = parts.length - 1; i >= 0; i--) {
      const c = resolveCountry(parts[i]);
      if (c && !country) { country = c; continue; }
    }
    if (parts.length >= 1) city = parts[0] || null;
    if (parts.length >= 2) region = parts[1] || null;
    if (!country) country = resolveCountry(loc);
    return { city, region, country };
  }

  private countryFromPhrases(desc: string): string | null {
    const m = desc.match(/\b(?:authorized to work in|eligible to work in|must reside in|based in|located in|residents? of)\s+(the\s+)?([a-z .]{2,30})/i);
    if (m) return resolveCountry(m[2]);
    return null;
  }

  private remoteScopedCountry(hay: string): string | null {
    const patterns = [
      /remote[,\s-]+(?:in|within|from|across)?\s*(?:the\s+)?([a-z .]{2,25})/i,
      /([a-z .]{2,25})[-\s]+remote\b/i,
      /remote\s*\(([a-z .]{2,25})\)/i,
      /remote[,\s-]+(us|usa|u\.s\.|canada|uk|india)\b/i,
    ];
    for (const re of patterns) {
      const m = hay.match(re);
      if (m) {
        const c = resolveCountry(m[1]);
        if (c) return c;
      }
    }
    return null;
  }

  private companyDomainFromUrl(url?: string): string | null {
    if (!url) return null;
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      // Skip ATS hosts — those aren't the employer's domain.
      if (/greenhouse\.io|lever\.co|myworkdayjobs\.com|ashbyhq\.com|workable\.com|smartrecruiters\.com|bamboohr\.com|jobvite\.com/i.test(host)) {
        return null;
      }
      return host;
    } catch {
      return null;
    }
  }
}
