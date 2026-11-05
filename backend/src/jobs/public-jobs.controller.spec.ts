import { PublicJobsController } from './public-jobs.controller';

describe('PublicJobsController listing mix', () => {
  it('does not lead the page with one company when that company posted the most roles', async () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => ({
        _id: `td-${i}`,
        title: 'Teller',
        companyName: 'TD',
        createdAt: new Date('2026-11-05T12:00:00.000Z'),
      })),
      { _id: 'bmo', title: 'Advisor', companyName: 'BMO', createdAt: new Date('2026-11-05T12:00:00.000Z') },
      { _id: 'shop', title: 'Engineer', companyName: 'Shopify', createdAt: new Date('2026-11-05T12:00:00.000Z') },
    ];
    const query: any = {};
    query.select = () => query;
    query.sort = () => query;
    query.skip = () => query;
    query.limit = () => query;
    query.lean = () => query;
    query.exec = () => Promise.resolve(rows);
    const jobModel = {
      find: () => query,
      countDocuments: () => Promise.resolve(rows.length),
    };
    const res = await new PublicJobsController(jobModel as any).list(undefined, undefined, undefined, '1', '10');
    expect(res.jobs).toHaveLength(10);
    expect(new Set(res.jobs.slice(0, 3).map((job) => job.company)).size).toBe(3);
    expect(res.total).toBe(10);
  });
});
