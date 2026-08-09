import { Injectable } from '@nestjs/common';
import { extractSkills, normalizeSkills } from './skill-taxonomy';

export interface ScoreCandidate {
  skills: string[]; // canonical
  title?: string;
  seniority?: string;
  remoteOnly?: boolean;
}
export interface ScoreJob {
  title?: string;
  description?: string;
  skills?: string[];
  workplaceType?: string;
  scrapedAt?: Date | string;
  source?: string;
}
export interface MatchFactor {
  key: string;
  label: string;
  weight: number;
  value: number; // 0..1
}
export interface MatchResult {
  score: number; // 0..100
  label: string;
  factors: MatchFactor[];
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
}

// Weights sum to 1. Simplified from the spec's 10-factor model to the factors we
// can compute deterministically from available data; versioned + configurable.
export const MATCH_ENGINE_VERSION = 'v1-deterministic';
const WEIGHTS = { skills: 0.45, title: 0.15, seniority: 0.12, location: 0.13, freshness: 0.15 };

const LEVELS = ['intern', 'entry', 'junior', 'mid', 'senior', 'lead', 'staff', 'principal', 'manager', 'director', 'vp', 'executive'];
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'for', 'in', 'at', 'senior', 'junior', 'staff', 'principal', 'lead', 'manager', 'director', 'i', 'ii', 'iii', 'engineer', 'specialist', 'analyst']);

@Injectable()
export class MatchScorerService {
  score(cand: ScoreCandidate, job: ScoreJob): MatchResult {
    const jobSkills = (job.skills && job.skills.length ? normalizeSkills(job.skills) : extractSkills(`${job.title || ''}\n${job.description || ''}`));
    const candSet = new Set(normalizeSkills(cand.skills).map((s) => s.toLowerCase()));

    const matchedSkills = jobSkills.filter((s) => candSet.has(s.toLowerCase()));
    const missingSkills = jobSkills.filter((s) => !candSet.has(s.toLowerCase()));

    // --- factor values (0..1) ---
    const skills = jobSkills.length
      ? matchedSkills.length / jobSkills.length
      : candSet.size
      ? 0.5
      : 0.3;
    const title = this.titleSimilarity(cand.title, job.title);
    const seniority = this.seniorityAlignment(cand.seniority || cand.title, job.title);
    const location = this.locationPref(cand, job);
    const freshness = this.freshness(job.scrapedAt);

    const factors: MatchFactor[] = [
      { key: 'skills', label: 'Skills match', weight: WEIGHTS.skills, value: skills },
      { key: 'title', label: 'Role relevance', weight: WEIGHTS.title, value: title },
      { key: 'seniority', label: 'Seniority fit', weight: WEIGHTS.seniority, value: seniority },
      { key: 'location', label: 'Location & workplace', weight: WEIGHTS.location, value: location },
      { key: 'freshness', label: 'Freshness', weight: WEIGHTS.freshness, value: freshness },
    ];

    const score = Math.round(factors.reduce((a, f) => a + f.weight * f.value, 0) * 100);
    const label = score >= 90 ? 'Excellent match' : score >= 80 ? 'Strong match' : score >= 70 ? 'Good match' : score >= 60 ? 'Possible match' : 'Exploratory';

    return { score, label, factors, matchedSkills, missingSkills, explanation: this.explain(score, jobSkills, matchedSkills, missingSkills, seniority) };
  }

  /* --------------------------------------------------------------- utils */
  private tokens(s?: string): string[] {
    return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t));
  }
  private titleSimilarity(a?: string, b?: string): number {
    const ta = new Set(this.tokens(a));
    const tb = new Set(this.tokens(b));
    if (!ta.size || !tb.size) return 0.4; // unknown → neutral
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    const union = new Set([...ta, ...tb]).size;
    return union ? inter / union : 0;
  }
  private levelOf(text?: string): number {
    const s = (text || '').toLowerCase();
    // Ordered high→low; phrase-aware so "Vice President" / "New Grad" resolve correctly.
    const hints: [string, RegExp][] = [
      ['executive', /\b(chief|ceo|cfo|cto|coo|c-level|executive|founder)\b/],
      ['vp', /\b(vice president|vp|svp|evp)\b/],
      ['director', /\b(director|head of)\b/],
      ['manager', /\b(manager|mgr)\b/],
      ['principal', /\bprincipal\b/],
      ['staff', /\bstaff\b/],
      ['lead', /\blead\b/],
      ['senior', /\b(senior|sr\.?)\b/],
      ['junior', /\b(junior|jr\.?)\b/],
      ['entry', /\b(entry|new grad|graduate|associate)\b/],
      ['intern', /\bintern\b/],
    ];
    for (const [level, re] of hints) if (re.test(s)) return LEVELS.indexOf(level);
    return 3; // default ~mid
  }
  private seniorityAlignment(candText?: string, jobText?: string): number {
    const c = this.levelOf(candText);
    const j = this.levelOf(jobText);
    const dist = Math.abs(c - j);
    if (dist === 0) return 1;
    if (dist === 1) return 0.8;
    if (dist === 2) return 0.55;
    // large gaps (e.g. entry vs executive) are strongly penalized
    return Math.max(0.1, 0.4 - (dist - 2) * 0.1);
  }
  private locationPref(cand: ScoreCandidate, job: ScoreJob): number {
    const wp = (job.workplaceType || '').toUpperCase();
    if (cand.remoteOnly) return wp === 'REMOTE' ? 1 : wp === 'HYBRID' ? 0.5 : 0.25;
    return wp === 'REMOTE' ? 0.9 : 0.7; // eligibility already ensured it's viable
  }
  private freshness(when?: Date | string): number {
    if (!when) return 0.5;
    const days = (Date.now() - new Date(when).getTime()) / 86400000;
    if (days <= 3) return 1;
    if (days <= 14) return 0.75;
    if (days <= 30) return 0.5;
    return 0.3;
  }
  private explain(score: number, jobSkills: string[], matched: string[], missing: string[], seniority: number): string {
    const parts: string[] = [];
    if (jobSkills.length) parts.push(`${matched.length} of ${jobSkills.length} key skills align${matched.length ? ` (${matched.slice(0, 4).join(', ')})` : ''}`);
    else parts.push('skills weren’t listed on this posting');
    if (missing.length) parts.push(`missing ${missing.slice(0, 3).join(', ')}`);
    if (seniority < 0.55) parts.push('seniority differs from your profile');
    return parts.join('; ') + '.';
  }
}
