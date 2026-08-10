import { PreparedExpiryService } from './prepared-expiry.service';

const chain = (val: any) => ({ exec: jest.fn().mockResolvedValue(val) });
const lean = (val: any) => ({ select: () => ({ lean: () => Promise.resolve(val) }) });

function build(overrides: { stale?: any[]; parked?: any[]; closedJobs?: any[] } = {}) {
  const stale = overrides.stale ?? [];
  const parked = overrides.parked ?? [];
  const closedJobs = overrides.closedJobs ?? [];

  let findCall = 0;
  const applicationModel: any = {
    // First call is the TTL sweep, second is the closed-job sweep.
    find: jest.fn(() => {
      findCall += 1;
      return lean(findCall === 1 ? stale : parked);
    }),
    updateOne: jest.fn(() => chain({})),
  };
  const jobModel: any = { find: jest.fn(() => lean(closedJobs)) };
  const events: any = { recordEvent: jest.fn().mockResolvedValue({}) };

  return {
    service: new PreparedExpiryService(applicationModel, jobModel, events),
    applicationModel,
    jobModel,
    events,
  };
}

describe('PreparedExpiryService', () => {
  describe('TTL', () => {
    it('expires preparations past their expiry date', async () => {
      const { service, applicationModel } = build({
        stale: [{ _id: 'a1', candidateId: 'c1', atsType: 'greenhouse' }],
      });

      const res = await service.sweep();

      expect(res.expiredByTtl).toBe(1);
      expect(applicationModel.updateOne.mock.calls[0][1].$set.status).toBe('expired');
    });

    it('queries only parked applications whose expiry has passed', async () => {
      const { service, applicationModel } = build();

      await service.sweep();

      const query = applicationModel.find.mock.calls[0][0];
      expect(query.status).toBe('awaiting_approval');
      expect(query['prepared.expiresAt'].$lt).toBeInstanceOf(Date);
    });
  });

  describe('closed jobs', () => {
    // A posting can close the day after it was prepared, long before the seven
    // days are up — submitting into it would be worse than useless.
    it('expires a preparation whose job is no longer active', async () => {
      const { service, events } = build({
        parked: [{ _id: 'a2', candidateId: 'c1', jobId: 'j1' }],
        closedJobs: [{ _id: 'j1' }],
      });

      const res = await service.sweep();

      expect(res.expiredByClosure).toBe(1);
      expect(events.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ats_expired', message: expect.stringMatching(/closed/i) }),
      );
    });

    it('leaves preparations whose job is still open', async () => {
      const { service, applicationModel } = build({
        parked: [{ _id: 'a2', candidateId: 'c1', jobId: 'j1' }],
        closedJobs: [],
      });

      const res = await service.sweep();

      expect(res.expiredByClosure).toBe(0);
      expect(applicationModel.updateOne).not.toHaveBeenCalled();
    });

    it('does not query jobs when nothing is parked', async () => {
      const { service, jobModel } = build({ parked: [] });

      await service.sweep();

      expect(jobModel.find).not.toHaveBeenCalled();
    });
  });

  it('reports both counts', async () => {
    const { service } = build({
      stale: [{ _id: 'a1', candidateId: 'c1' }],
      parked: [{ _id: 'a2', candidateId: 'c1', jobId: 'j1' }],
      closedJobs: [{ _id: 'j1' }],
    });

    expect(await service.sweep()).toEqual({ expiredByTtl: 1, expiredByClosure: 1 });
  });
});
