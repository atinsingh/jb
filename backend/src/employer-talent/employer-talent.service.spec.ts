import { Types } from 'mongoose';
import { EmployerTalentService } from './employer-talent.service';

describe('EmployerTalentService.create — candidateId/email support', () => {
  it('persists an optional candidateId and email when provided', async () => {
    const saved: any = {};
    const CandidateModelMock: any = function (doc: any) {
      Object.assign(this, doc);
      this.save = jest.fn().mockResolvedValue({ ...doc });
    };
    const service = new EmployerTalentService(CandidateModelMock);

    const result: any = await service.create('owner-1', {
      name: 'Jordan Lee',
      candidateId: new Types.ObjectId().toString(),
      email: 'jordan@example.com',
    } as any);

    expect(result.candidateId).toBeDefined();
    expect(result.email).toBe('jordan@example.com');
  });
});
