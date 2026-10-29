import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { listingResumeInput } from './listing-resume';

const dto = {
  model: 'm',
  effort: 'low',
  jobDescription: 'client pasted text',
  jobUrl: 'https://boards.example/jobs/1',
  publicJobId: '507f1f77bcf86cd799439011',
} as any;

describe('listingResumeInput', () => {
  it('refuses a free caller before any résumé session exists', () => {
    expect(() =>
      listingResumeInput('FREE', { title: 'Engineer', description: 'Build APIs' }, dto),
    ).toThrow(ForbiddenException);
  });

  it('uses the stored listing and ignores the client description and url', () => {
    expect(
      listingResumeInput('PRO', { title: 'Engineer', description: '<p>Build APIs</p>' }, dto),
    ).toEqual({
      model: 'm',
      effort: 'low',
      targetRole: 'Engineer',
      jobDescription: 'Build APIs',
    });
  });

  it('reports a missing listing', () => {
    expect(() => listingResumeInput('PRO', null, dto)).toThrow(NotFoundException);
  });
});
