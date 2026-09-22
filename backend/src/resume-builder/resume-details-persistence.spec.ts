import { ResumeBuilderService } from './resume-builder.service';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('Resume Details persistence', () => {
  it('keeps achievements and certifications on an imported Resume document', async () => {
    const saved: any[] = [];
    const ResumeModel: any = function ResumeModel(data: any) {
      Object.assign(this, data);
      this.save = jest.fn(async () => {
        saved.push(this);
        return this;
      });
    };
    const userModel = {
      findById: jest.fn(() => ({ exec: () => Promise.resolve({ _id: 'user-1' }) })),
    };
    const service = new ResumeBuilderService(
      ResumeModel,
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { check: jest.fn(() => ({ score: 100, findings: [], extractedTextLength: 10 })) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { sanitize: (value: string) => value } as any,
    );

    const result: any = await service.importResume('507f1f77bcf86cd799439011', {
      name: 'Imported resume',
      importMode: 'keep_format',
      achievements: ['Conference speaker'],
      certifications: [{ name: 'AWS Certified', issuer: 'AWS', date: '2025' }],
    });

    expect(saved).toHaveLength(1);
    expect(result.achievements).toEqual(['Conference speaker']);
    expect(result.certifications).toEqual([
      { name: 'AWS Certified', issuer: 'AWS', date: '2025' },
    ]);
    expect(result.creationMethod).toBe('imported');
  });
});
