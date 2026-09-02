import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import {
  UserPreferences,
  UserPreferencesDocument,
} from '../schemas/user-preferences.schema';

/**
 * Identity — required. A document without a name or a way to reach the
 * candidate is not a résumé, so generation is blocked until these exist.
 * Email is guaranteed by sign-up; the rest come from Settings.
 */
export const REQUIRED_FIELDS = ['name', 'email', 'linkedin', 'location'] as const;

/**
 * History — optional. These make a résumé good rather than possible. When they
 * are absent the intended path is to import them from LinkedIn, and if that
 * fails to generate anyway from what is on file: a thinner résumé is a far
 * better outcome than a blocked one, and far better than an invented one.
 */
export const OPTIONAL_FIELDS = [
  'experience',
  'education',
  'skills',
  'certifications',
  'achievements',
] as const;

export interface CandidateContext {
  /** The context file written into the sandbox alongside AGENTS.md. */
  markdown: string;
  /** Required identity fields still missing. Non-empty blocks generation. */
  missing: string[];
  /** Optional history the résumé would be richer for. Never blocks. */
  optionalGaps: string[];
  /** True once every required field is present. */
  hasEnoughToGenerate: boolean;
  /** Short summary for the UI, so the screen can say where the facts came from. */
  summary: { name?: string; headline?: string; roles: string[] };
}

/**
 * Assembles what the candidate has already told us into one document for the
 * harness to write from.
 *
 * This is the retrieval half of the product promise. "Qualifications are not
 * invented" is only enforceable if the real ones are in front of the model, so
 * profile, work history and eligibility are written into the sandbox and the
 * shared rules point the harness at them.
 *
 * It also settles what the resume screen may ask for. Name, location,
 * seniority and work authorisation are already answered in Settings and
 * Preferences; asking again is a second source of truth that will disagree with
 * the first. The screen collects only what is genuinely per-resume — the target
 * role, a job description, and free-text instructions.
 *
 * Only candidate-facing fields are copied. Account internals (password hash,
 * Supabase id, Stripe customer, tokens) must never reach a sandbox, and a test
 * asserts they do not.
 */
@Injectable()
export class CandidateContextService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserPreferences.name)
    private readonly prefsModel: Model<UserPreferencesDocument>,
  ) {}

  async build(userId: string): Promise<CandidateContext> {
    const [user, prefs] = await Promise.all([
      this.userModel.findById(userId).lean().exec() as Promise<any>,
      this.prefsModel.findOne({ userId }).lean().exec() as Promise<any>,
    ]);

    const sections: string[] = ['# Candidate facts', '', this.preamble()];

    const identity = this.identity(user);
    if (identity) sections.push(identity);

    const experience = this.experience(user?.experience);
    if (experience) sections.push(experience);

    const education = this.education(user?.education);
    if (education) sections.push(education);

    const skills = this.list('Skills', user?.skills);
    if (skills) sections.push(skills);

    const certifications = this.certifications(user?.certifications);
    if (certifications) sections.push(certifications);

    const achievements = this.list('Achievements', user?.achievements);
    if (achievements) sections.push(achievements);

    const eligibility = this.eligibility(prefs);
    if (eligibility) sections.push(eligibility);

    const targeting = this.targeting(prefs);
    if (targeting) sections.push(targeting);

    const present = (v: unknown) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v);

    const missing = REQUIRED_FIELDS.filter((f) => !present(user?.[f]));
    const optionalGaps = OPTIONAL_FIELDS.filter((f) => !present(user?.[f]));

    return {
      markdown: `${sections.join('\n')}\n`,
      missing: [...missing],
      optionalGaps: [...optionalGaps],
      hasEnoughToGenerate: missing.length === 0,
      summary: {
        name: user?.name,
        headline: user?.headline,
        roles: prefs?.titles || [],
      },
    };
  }

  private preamble(): string {
    return [
      'Everything below comes from the candidate’s own profile and preferences.',
      'It is the ONLY source of biographical fact available to you.',
      '',
      'Do not invent employers, dates, titles, degrees, certifications or',
      'metrics that are not written here. If something a resume would normally',
      'contain is absent, leave it out rather than filling the gap — an omission',
      'is recoverable, a fabrication is not.',
      '',
    ].join('\n');
  }

  private identity(user: any): string | null {
    if (!user) return null;
    const rows = [
      ['Name', user.name],
      ['Headline', user.headline],
      ['Email', user.email],
      ['Phone', user.phone],
      ['Location', user.location],
      ['LinkedIn', user.linkedin],
    ].filter(([, v]) => Boolean(v));

    if (!rows.length) return null;
    const lines = rows.map(([k, v]) => `- ${k}: ${v}`);
    if (user.summary) lines.push('', `Summary: ${user.summary}`);
    return ['## Identity', '', ...lines, ''].join('\n');
  }

  private experience(items?: any[]): string | null {
    if (!items?.length) return null;
    const blocks = items.map((e) => {
      const when = [e.startDate, e.current ? 'Present' : e.endDate]
        .filter(Boolean)
        .join(' – ');
      const head = [e.title, e.company].filter(Boolean).join(' — ');
      const lines = [`### ${head}`];
      if (when) lines.push(`${when}${e.location ? ` · ${e.location}` : ''}`);
      if (e.description) lines.push('', e.description);
      for (const a of e.achievements || []) lines.push(`- ${a}`);
      return lines.join('\n');
    });
    return ['## Experience', '', ...blocks, ''].join('\n');
  }

  private education(items?: any[]): string | null {
    if (!items?.length) return null;
    const lines = items.map((e) => {
      const when = [e.startDate, e.endDate].filter(Boolean).join(' – ');
      return `- ${[e.degree, e.institution].filter(Boolean).join(', ')}${
        when ? ` (${when})` : ''
      }${e.gpa ? ` · GPA ${e.gpa}` : ''}`;
    });
    return ['## Education', '', ...lines, ''].join('\n');
  }

  private certifications(items?: any[]): string | null {
    if (!items?.length) return null;
    const lines = items.map((c) => {
      const parts = [c.name, c.issuer].filter(Boolean).join(' — ');
      return `- ${parts}${c.year ? ` (${c.year})` : ''}`;
    });
    return ['## Certifications', '', ...lines, ''].join('\n');
  }

  private list(heading: string, values?: string[]): string | null {
    if (!values?.length) return null;
    return [`## ${heading}`, '', values.join(', '), ''].join('\n');
  }

  private eligibility(prefs: any): string | null {
    if (!prefs) return null;
    const rows = [
      ['Based in', [prefs.region, prefs.country].filter(Boolean).join(', ')],
      ['Work auth', (prefs.workAuthCountries || []).join(', ')],
      [
        'Sponsorship',
        prefs.visaSponsorshipNeeded === undefined
          ? ''
          : prefs.visaSponsorshipNeeded
            ? 'required'
            : 'not required',
      ],
      [
        'Relocation',
        prefs.willingToRelocate === undefined
          ? ''
          : prefs.willingToRelocate
            ? `open${prefs.internationalRelocation ? ' (incl. international)' : ''}`
            : 'not open',
      ],
    ].filter(([, v]) => Boolean(v));

    if (!rows.length) return null;
    return [
      '## Eligibility',
      '',
      'State work authorisation only as written here, and never claim a status',
      'the candidate does not hold.',
      '',
      ...rows.map(([k, v]) => `- ${k}: ${v}`),
      '',
    ].join('\n');
  }

  private targeting(prefs: any): string | null {
    if (!prefs) return null;
    const rows = [
      ['Target roles', (prefs.titles || []).join(', ')],
      ['Preferred locations', (prefs.locations || []).join(', ')],
      ['Workplace', (prefs.workplaceTypes || []).join(', ')],
      ['Employment', (prefs.employmentTypes || []).join(', ')],
      ['Industries', (prefs.preferredIndustries || []).join(', ')],
    ].filter(([, v]) => Boolean(v));

    if (!rows.length) return null;
    return [
      '## Targeting',
      '',
      'Preferences, for emphasis only — they never license a claim that is not',
      'supported above.',
      '',
      ...rows.map(([k, v]) => `- ${k}: ${v}`),
      '',
    ].join('\n');
  }
}
