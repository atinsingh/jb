import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ImportResumeDto, UpdateResumeDocumentDto } from './resume-details.dto';

describe('resume details DTO validation', () => {
  it.each([ImportResumeDto, UpdateResumeDocumentDto])(
    '%s rejects malformed manual resume sections',
    async (Dto) => {
      const value = plainToInstance(Dto, {
        skills: ['TypeScript', 42],
        achievements: ['Speaker', null],
        experience: [{ title: '', company: 'Example Co' }],
        certifications: [{ issuer: 'AWS' }],
      });

      const errors = await validate(value as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['skills', 'achievements', 'experience', 'certifications']),
      );
    },
  );

  it('accepts the validated fields used by Compare Resume', async () => {
    const value = plainToInstance(UpdateResumeDocumentDto, {
      fullName: 'Jordan Reyes',
      skills: ['TypeScript'],
      achievements: ['Conference speaker'],
      experience: [{
        title: 'Engineer',
        company: 'Example Co',
        startDate: '2023',
        description: 'Built APIs.',
        achievements: ['Reduced latency.'],
      }],
      certifications: [{ name: 'AWS Certified', issuer: 'AWS', date: '2025' }],
    });

    await expect(validate(value as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    })).resolves.toEqual([]);
  });
});
