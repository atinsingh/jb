jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn() },
}));

import axios from 'axios';
import { WorkdayMonitorService } from './workday-monitor.service';

describe('WorkdayMonitorService', () => {
  const original = process.env.WORKDAY_SITES;

  afterEach(() => {
    if (original === undefined) delete process.env.WORKDAY_SITES;
    else process.env.WORKDAY_SITES = original;
    jest.clearAllMocks();
  });

  it('posts to the employer host and keeps a Canada role posted today', async () => {
    process.env.WORKDAY_SITES = 'td.wd3.myworkdayjobs.com/td/TD_Bank_Careers';
    (axios.post as jest.Mock).mockResolvedValue({
      data: {
        jobPostings: [
          {
            title: 'Advisor',
            externalPath: '/job/Dieppe-New-Brunswick/Advisor_R_1',
            locationsText: '3 Locations',
            postedOn: 'Posted Today',
            bulletFields: ['R_1'],
          },
          {
            title: 'US role',
            externalPath: '/job/Seattle-Washington/Us_R_2',
            postedOn: 'Posted Today',
            bulletFields: ['R_2'],
          },
        ],
      },
    });
    (axios.get as jest.Mock).mockResolvedValue({
      data: { jobPostingInfo: { jobDescription: '<p>Advise clients</p>' } },
    });
    const jobs = {
      exists: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    const geo = { deriveLogo: jest.fn().mockReturnValue('https://unavatar.io/td.com?fallback=false') };
    await new WorkdayMonitorService(jobs as any, geo as any).run();
    expect(axios.post).toHaveBeenCalledWith(
      'https://td.wd3.myworkdayjobs.com/wday/cxs/td/TD_Bank_Careers/jobs',
      expect.objectContaining({ limit: 20, offset: 0 }),
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': 'Mozilla/5.0' }) }),
    );
    expect(jobs.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(jobs.findOneAndUpdate.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        externalId: 'workday:td:R_1',
        country: 'CA',
        companyName: 'TD',
        companyLogo: 'https://unavatar.io/td.com?fallback=false',
        description: 'Advise clients',
      }),
    );
  });

  it('keeps every role posted today and stops once a page has none', async () => {
    process.env.WORKDAY_SITES = 'td.wd3.myworkdayjobs.com/td/TD_Bank_Careers';
    process.env.WORKDAY_FETCH_DETAILS = 'false';
    const today = Array.from({ length: 20 }, (_, i) => ({
      title: `Role ${i}`,
      externalPath: `/job/Toronto/Role_${i}`,
      locationsText: 'Toronto, Ontario',
      postedOn: 'Posted Today',
      bulletFields: [`R_${i}`],
    }));
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { jobPostings: today } })
      .mockResolvedValueOnce({
        data: {
          jobPostings: [{
            title: 'Old',
            externalPath: '/job/Toronto/Old',
            locationsText: 'Toronto',
            postedOn: 'Posted Yesterday',
            bulletFields: ['OLD'],
          }],
        },
      });
    const jobs = {
      exists: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    await new WorkdayMonitorService(jobs as any, { deriveLogo: jest.fn().mockReturnValue('') } as any).run();
    expect(jobs.findOneAndUpdate).toHaveBeenCalledTimes(20);
    expect(axios.post).toHaveBeenCalledTimes(2);
    delete process.env.WORKDAY_FETCH_DETAILS;
  });
});
