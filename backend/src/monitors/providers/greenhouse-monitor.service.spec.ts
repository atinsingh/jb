jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import axios from 'axios';
import { GreenhouseMonitorService } from './greenhouse-monitor.service';

describe('GreenhouseMonitorService', () => {
  const original = process.env.GREENHOUSE_BOARDS;

  afterEach(() => {
    if (original === undefined) delete process.env.GREENHOUSE_BOARDS;
    else process.env.GREENHOUSE_BOARDS = original;
    jest.clearAllMocks();
  });

  function service() {
    const jobs = {
      exists: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    const geo = {
      normalize: jest.fn().mockReturnValue({}),
      deriveLogo: jest.fn().mockReturnValue(''),
    };
    return { jobs, geo, monitor: new GreenhouseMonitorService(jobs as any, geo as any) };
  }

  it('fetches the built-in boards when GREENHOUSE_BOARDS is unset', async () => {
    delete process.env.GREENHOUSE_BOARDS;
    (axios.get as jest.Mock).mockResolvedValue({ data: { jobs: [] } });
    const { monitor } = service();
    await monitor.run();
    expect((axios.get as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'https://boards-api.greenhouse.io/v1/boards/hootsuite/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/unbounce/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/ritual/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/later/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true',
    ]);
  });

  it('stores plain text for a Canada role posted today and skips the rest', async () => {
    process.env.GREENHOUSE_BOARDS = 'acme';
    const posted = new Date().toISOString();
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        jobs: [
          {
            id: 1,
            title: 'Engineer',
            absolute_url: 'https://acme.example/jobs/1',
            content: '<p>Build APIs</p>',
            location: { name: 'Toronto, Canada' },
            first_published: posted,
          },
          {
            id: 2,
            title: 'Old role',
            absolute_url: 'https://acme.example/jobs/2',
            content: '<p>Old</p>',
            location: { name: 'Toronto, Canada' },
            first_published: new Date(Date.now() - 2 * 864e5).toISOString(),
          },
          {
            id: 3,
            title: 'US role',
            absolute_url: 'https://acme.example/jobs/3',
            content: '<p>US</p>',
            location: { name: 'Seattle' },
            first_published: posted,
          },
          {
            id: 4,
            title: 'Remote role',
            absolute_url: 'https://acme.example/jobs/4',
            content: '<p>Remote</p>',
            location: { name: 'Remote, Canada; Remote, United States' },
            first_published: posted,
          },
        ],
      },
    });
    const { jobs, geo, monitor } = service();
    geo.normalize.mockImplementation(({ location }) => {
      const name = String(location);
      if (name.includes('Canada') && name.includes('United States')) {
        return { country: 'US', eligibleCountries: ['CA'] };
      }
      return { country: name.includes('Canada') ? 'CA' : 'US', eligibleCountries: [] };
    });
    await monitor.run();
    expect(jobs.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(jobs.findOneAndUpdate).toHaveBeenCalledWith(
      { externalId: 'greenhouse:1' },
      {
        $set: expect.not.objectContaining({ isActive: true }),
        $setOnInsert: { isActive: true },
      },
      { upsert: true, new: true },
    );
    expect(jobs.findOneAndUpdate.mock.calls[0][1].$set).toEqual(
      expect.objectContaining({ description: 'Build APIs', isExternal: true, country: 'CA', postedAt: new Date(posted) }),
    );
  });
});
