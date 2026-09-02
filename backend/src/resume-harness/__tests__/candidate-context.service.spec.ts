import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CandidateContextService } from '../candidate-context.service';
import { User } from '../../schemas/user.schema';
import { UserPreferences } from '../../schemas/user-preferences.schema';

/**
 * The candidate's own data, assembled for the harness.
 *
 * The product promise is that qualifications are never invented. A harness can
 * only honour that if the facts are in front of it, so everything the candidate
 * already told us — profile, work history, eligibility — is written into the
 * sandbox as a context file and the shared rules point at it.
 *
 * The corollary matters just as much: the screen must not ask again for
 * anything already on file. Name, location, seniority and work authorisation
 * come from Settings and Preferences, not from a form the candidate retypes.
 */
describe('CandidateContextService', () => {
  let service: CandidateContextService;

  const USER = {
    _id: 'u1',
    name: 'Jordan Reyes',
    email: 'jordan@example.com',
    phone: '+1 555 0100',
    location: 'Toronto, ON',
    headline: 'Senior Backend Engineer',
    linkedin: 'https://linkedin.com/in/jordanreyes',
    summary: 'Eight years building payment systems.',
    skills: ['Node.js', 'PostgreSQL', 'AWS'],
    experience: [
      {
        title: 'Senior Backend Engineer',
        company: 'Acme Corp',
        location: 'Toronto',
        startDate: '2019-01',
        current: true,
        achievements: ['Cut checkout latency 40%'],
      },
    ],
    education: [
      { degree: 'BSc Computer Science', institution: 'UofT', endDate: '2015' },
    ],
  };

  const PREFS = {
    titles: ['Staff Engineer', 'Backend Lead'],
    locations: ['Toronto', 'Remote'],
    country: 'CA',
    region: 'Ontario',
    workAuthCountries: ['CA', 'US'],
    visaSponsorshipNeeded: false,
    willingToRelocate: true,
    workplaceTypes: ['remote', 'hybrid'],
    employmentTypes: ['full_time'],
    preferredIndustries: ['Fintech'],
  };

  const userModel: any = { findById: jest.fn() };
  const prefsModel: any = { findOne: jest.fn() };

  const lean = (doc: any) => ({ lean: () => ({ exec: async () => doc }) });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateContextService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(UserPreferences.name), useValue: prefsModel },
      ],
    }).compile();
    service = module.get(CandidateContextService);
  });

  const build = (user: any = USER, prefs: any = PREFS) => {
    userModel.findById.mockReturnValue(lean(user));
    prefsModel.findOne.mockReturnValue(lean(prefs));
    return service.build('u1');
  };

  it('carries the identity and contact facts a resume needs', async () => {
    const ctx = await build();
    for (const fact of [
      'Jordan Reyes',
      'jordan@example.com',
      'Toronto, ON',
      'https://linkedin.com/in/jordanreyes',
      'Senior Backend Engineer',
    ]) {
      expect(ctx.markdown).toContain(fact);
    }
  });

  it('carries work history, education and skills', async () => {
    const ctx = await build();
    expect(ctx.markdown).toContain('Acme Corp');
    expect(ctx.markdown).toContain('Cut checkout latency 40%');
    expect(ctx.markdown).toContain('BSc Computer Science');
    expect(ctx.markdown).toContain('PostgreSQL');
  });

  it('carries eligibility from preferences, not from the resume screen', async () => {
    const ctx = await build();
    // Work authorisation and sponsorship drive what a resume may claim, and
    // they are already answered in Preferences.
    expect(ctx.markdown).toMatch(/work auth/i);
    expect(ctx.markdown).toContain('CA');
    expect(ctx.markdown).toMatch(/sponsorship/i);
  });

  it('omits sections it has no data for rather than emitting empty headings', async () => {
    const ctx = await build(
      { _id: 'u1', name: 'Sam Lee', email: 'sam@example.com' },
      null,
    );
    expect(ctx.markdown).toContain('Sam Lee');
    expect(ctx.markdown).not.toMatch(/##\s*Experience/i);
    expect(ctx.markdown).not.toMatch(/undefined|null/);
  });

  it('treats identity fields as required and everything else as optional', async () => {
    const full = await build();
    expect(full.missing).toEqual([]);
    expect(full.hasEnoughToGenerate).toBe(true);

    // Identity is what a resume cannot be written without: a document with no
    // name or no way to contact the candidate is not a resume.
    const noIdentity = await build(
      { _id: 'u1', email: 'sam@example.com', experience: USER.experience },
      null,
    );
    expect(noIdentity.missing).toEqual(
      expect.arrayContaining(['name', 'linkedin', 'location']),
    );
    expect(noIdentity.hasEnoughToGenerate).toBe(false);
  });

  it('generates from identity alone when the optional history is absent', async () => {
    // Work history, certifications and achievements enrich a resume but must
    // not block one. The candidate can add them later, or LinkedIn import can
    // fill them; either way an empty history is a thinner resume, not an error.
    const identityOnly = await build(
      {
        _id: 'u1',
        name: 'Sam Lee',
        email: 'sam@example.com',
        linkedin: 'https://linkedin.com/in/samlee',
        location: 'Vancouver, BC',
      },
      null,
    );
    expect(identityOnly.hasEnoughToGenerate).toBe(true);
    expect(identityOnly.missing).toEqual([]);
    expect(identityOnly.optionalGaps).toEqual(
      expect.arrayContaining(['experience', 'certifications', 'achievements']),
    );
  });

  it('carries certifications and achievements when the account has them', async () => {
    const ctx = await build({
      ...USER,
      certifications: [
        { name: 'AWS Solutions Architect', issuer: 'Amazon', year: '2023' },
      ],
      achievements: ['Speaker, NodeConf 2024'],
    } as any);
    expect(ctx.markdown).toContain('AWS Solutions Architect');
    expect(ctx.markdown).toContain('NodeConf 2024');
  });

  it('never emits account internals into the sandbox', async () => {
    const ctx = await build({
      ...USER,
      password: 'hashed-secret',
      supabaseUserId: 'sb-123',
      stripeCustomerId: 'cus_123',
      tokenVersion: 4,
      resetPasswordToken: 'reset-me',
    } as any);
    for (const secret of ['hashed-secret', 'sb-123', 'cus_123', 'reset-me']) {
      expect(ctx.markdown).not.toContain(secret);
    }
  });
});
