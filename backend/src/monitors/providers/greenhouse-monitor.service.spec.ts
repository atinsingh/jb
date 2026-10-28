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
      'https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/airbnb/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true',
      'https://boards-api.greenhouse.io/v1/boards/notion/jobs?content=true',
    ]);
  });

  it('stores plain text for a greenhouse html description', async () => {
    process.env.GREENHOUSE_BOARDS = 'acme';
    (axios.get as jest.Mock).mockResolvedValue({
      data: {
        jobs: [{
          id: 1,
          title: 'Engineer',
          absolute_url: 'https://acme.example/jobs/1',
          content: '<p>Build APIs</p>',
          location: { name: 'Remote' },
        }],
      },
    });
    const { jobs, monitor } = service();
    await monitor.run();
    expect(jobs.findOneAndUpdate).toHaveBeenCalledWith(
      { externalId: 'greenhouse:1' },
      expect.objectContaining({ description: 'Build APIs', isActive: true, isExternal: true }),
      { upsert: true, new: true },
    );
  });
});
