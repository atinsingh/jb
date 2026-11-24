import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EmployerCandidateSearchService } from './employer-candidate-search.service';

const ADA = '507f1f77bcf86cd799439011';

describe('EmployerCandidateSearchService.search', () => {
  const limits: number[] = [];
  const ada = {
    _id: new Types.ObjectId(ADA),
    role: 'ROLE_CANDIDATE',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '5550101000',
    linkedin: 'https://www.linkedin.com/in/ada-lovelace',
    location: 'London',
    headline: '',
  };
  const backendResume = {
    _id: new Types.ObjectId(),
    userId: ada._id,
    status: 'ready',
    creationMethod: 'generated',
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    targetRole: 'Senior Backend Engineer',
    targetCompany: 'Acme',
    headline: 'Backend engineer',
    skills: ['TypeScript'],
  };
  const otherResume = {
    _id: new Types.ObjectId(),
    userId: ada._id,
    status: 'ready',
    creationMethod: 'job_tailored',
    fullName: 'Bob Other',
    email: 'bob@elsewhere.com',
    linkedin: 'https://www.linkedin.com/in/bob-other',
    targetRole: 'Nurse',
    skills: ['Nursing'],
  };

  function chain(rows: unknown[]) {
    const api: any = {
      limit: jest.fn((n: number) => {
        limits.push(n);
        return api;
      }),
      select: jest.fn(() => api),
      lean: jest.fn(async () => rows),
    };
    return api;
  }

  function service() {
    const users = { find: jest.fn(() => chain([ada])) };
    const resumes = { find: jest.fn(() => chain([backendResume, otherResume])) };
    const reviews = { find: jest.fn(() => chain([])) };
    const sessions = { find: jest.fn(() => chain([])) };
    return new EmployerCandidateSearchService(users as any, resumes as any, reviews as any, sessions as any);
  }

  beforeEach(() => {
    limits.length = 0;
  });

  it('requires a name or a role', async () => {
    await expect(service().search({ q: '  ', role: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns one identity-matched candidate and caps discovery', async () => {
    const result = await service().search({ q: 'Ada', role: 'Backend' });

    expect(limits.length).toBeGreaterThan(0);
    expect(limits.every((n) => n === 200)).toBe(true);
    expect(result.total).toBe(1);
    expect(result.candidates).toEqual([
      {
        candidateId: ADA,
        name: 'Ada Lovelace',
        headline: 'Backend engineer',
        location: 'London',
        targetRoles: ['Senior Backend Engineer', 'Backend engineer'],
        matchedRoles: ['Senior Backend Engineer', 'Backend engineer'],
        skills: ['TypeScript'],
      },
    ]);
    const body = JSON.stringify(result);
    expect(body).not.toContain('bob@elsewhere.com');
    expect(body).not.toContain('Nurse');
    expect(body).not.toContain('Bob Other');
    expect(body).not.toContain('Acme');
  });

  it('returns the candidate when their résumé was saved on another account', async () => {
    const imported = {
      ...backendResume,
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      creationMethod: 'imported',
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
    };
    const users = { find: jest.fn(() => chain([ada])) };
    const resumes = { find: jest.fn(() => chain([imported])) };
    const reviews = { find: jest.fn(() => chain([{ resumeId: String(imported._id), jobText: '' }])) };
    const sessions = { find: jest.fn(() => chain([])) };
    const result = await new EmployerCandidateSearchService(
      users as any, resumes as any, reviews as any, sessions as any,
    ).search({ q: 'Ada' });

    expect(result.candidates.map((row) => row.candidateId)).toEqual([ADA]);
    expect(result.candidates[0].name).toBe('Ada Lovelace');
  });

  it('requires both the name and the role when both are set', async () => {
    const result = await service().search({ q: 'Ada', role: 'Nurse' });
    expect(result.candidates).toEqual([]);
  });

  it('recommends the identity-matched résumé for a posted job and ignores a résumé written for someone else', async () => {
    const matched = await service().recommend({ title: 'Senior Backend Engineer', skills: ['TypeScript'] });
    expect(matched.candidates.map((row) => row.candidateId)).toEqual([ADA]);
    expect(matched.candidates[0].matchedRoles).toEqual(['Senior Backend Engineer', 'Backend engineer']);
    expect(JSON.stringify(matched)).not.toContain('Nurse');

    const otherPerson = await service().recommend({ title: 'Nurse Recruiter', skills: ['Nursing'] });
    expect(otherPerson.candidates).toEqual([]);
  });

  it('recommends a skill on the account holder résumé when the job title does not match', async () => {
    const result = await service().recommend({ title: 'Office Manager', skills: ['TypeScript'] });
    expect(result.candidates.map((row) => row.name)).toEqual(['Ada Lovelace']);
    expect(result.candidates[0].matchedRoles).toEqual([]);
  });

  it('returns nobody when a job has no title and no skills', async () => {
    const result = await service().recommend({ title: '  ', skills: [] });
    expect(result.candidates).toEqual([]);
  });
});
