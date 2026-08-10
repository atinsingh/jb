import { Injectable } from '@nestjs/common';
import { AtsMatchResult, AtsStructuredResume } from './ats.types';
import { extractSkills, normalizeSkills } from '../matching/skill-taxonomy';

/**
 * "Does this résumé match THIS job?"
 *
 * A different question from parseability, and deliberately kept separate: this
 * one is a property of a pairing, so it changes per application and is never
 * stored on the résumé. Conflating the two would give the library's score ring
 * a number that means nothing without a job attached.
 *
 * Requirements are extracted with the SAME `extractSkills` the job matcher uses,
 * which only yields canonical skills it recognises. An earlier version here
 * tokenised the job description and treated every non-stopword as a
 * requirement — which counted words like "use" and "needed" as things the
 * candidate had failed to demonstrate, making coverage meaningless. Reusing the
 * existing vocabulary is also what stops this drifting from job matching, so the
 * two can never disagree about whether someone "has TypeScript".
 */

/** A job description can reasonably ask for more concepts than a job card shows. */
const MAX_REQUIREMENTS = 40;

@Injectable()
export class AtsMatchService {
  /**
   * Compare a résumé against a job description.
   *
   * @returns coverage plus matched and missing concepts. The missing list is the
   *          actionable part — a bare percentage tells a candidate nothing about
   *          what to change.
   */
  match(resume: AtsStructuredResume | string, jobDescription: string): AtsMatchResult {
    const required = extractSkills(jobDescription, MAX_REQUIREMENTS);
    if (!required.length) {
      return { coverage: 0, matched: [], missing: [], keywordCount: 0 };
    }

    const evidenced = this.resumeSkills(resume);
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of required) {
      (evidenced.has(skill) ? matched : missing).push(skill);
    }

    return {
      coverage: Math.round((matched.length / required.length) * 100),
      matched,
      missing,
      keywordCount: required.length,
    };
  }

  /**
   * Every canonical skill the résumé evidences.
   *
   * Drawn from BOTH the declared skills list and the free text, because a
   * candidate who describes shipping a Node service in a bullet has evidenced
   * Node whether or not they listed it.
   */
  private resumeSkills(resume: AtsStructuredResume | string): Set<string> {
    if (typeof resume === 'string') {
      return new Set(extractSkills(resume, MAX_REQUIREMENTS));
    }

    const declared = normalizeSkills(resume.skills || []);
    const fromText = extractSkills(this.flattenResume(resume), MAX_REQUIREMENTS);
    return new Set([...declared, ...fromText]);
  }

  private flattenResume(resume: AtsStructuredResume): string {
    const parts: string[] = [];
    const walk = (v: any) => {
      if (v === null || v === undefined) return;
      if (typeof v === 'string' || typeof v === 'number') {
        parts.push(String(v));
        return;
      }
      if (Array.isArray(v)) return v.forEach(walk);
      if (typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(resume);
    return parts.join(' ');
  }
}
