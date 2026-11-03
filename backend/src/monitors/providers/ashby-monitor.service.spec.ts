jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import axios from 'axios';
import { AshbyMonitorService } from './ashby-monitor.service';

describe('AshbyMonitorService', () => {
  const original = process.env.ASHBY_BOARDS;

  afterEach(() => {
    if (original === undefined) delete process.env.ASHBY_BOARDS;
    else process.env.ASHBY_BOARDS = original;
    jest.clearAllMocks();
  });

  function service() {
    const jobs = {
      exists: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    const geo = { deriveLogo: jest.fn().mockReturnValue('https://unavatar.io/koho.com?fallback=false') };
    return { jobs, monitor: new AshbyMonitorService(jobs as any, geo as any) };
  }

  it('fetches the built-in Canadian boards when ASHBY_BOARDS is unset', async () => {
    delete process.env.ASHBY_BOARDS;
    (axios.get as jest.Mock).mockResolvedValue({ data: { jobs: [] } });
    const { monitor } = service();
    await monitor.run();
    expect((axios.get as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'https://api.ashbyhq.com/posting-api/job-board/wealthsimple',
      'https://api.ashbyhq.com/posting-api/job-board/jobber',
      'https://api.ashbyhq.com/posting-api/job-board/1password',
      'https://api.ashbyhq.com/posting-api/job-board/koho',
      'https://api.ashbyhq.com/posting-api/job-board/lightspeedhq',
      'https://api.ashbyhq.com/posting-api/job-board/clearco',
    ]);
  });

  it('stores a Canada role posted today and skips other countries', async () => {
    process.env.ASHBY_BOARDS = 'koho';
    const posted = new Date().toISOString();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        jobs: [
          { id: 'ca', title: 'Designer', location: 'Remote (Canada)', publishedAt: posted, applyUrl: 'https://jobs.ashbyhq.com/koho/ca/application', descriptionPlain: 'Design the app' },
          { id: 'eu', title: 'Seller', location: 'Ghent', publishedAt: posted, descriptionPlain: 'Sell' },
        ],
      },
    });
    const { jobs, monitor } = service();
    await monitor.run();
    expect(jobs.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(jobs.findOneAndUpdate.mock.calls[0][1]).toEqual(
      expect.objectContaining({ externalId: 'ashby:ca', country: 'CA', source: 'Ashby', companyName: 'Koho', companyLogo: 'https://unavatar.io/koho.com?fallback=false' }),
    );
  });
});
