jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import axios from 'axios';
import { LeverMonitorService } from './lever-monitor.service';

describe('LeverMonitorService', () => {
  const original = process.env.LEVER_BOARDS;

  afterEach(() => {
    if (original === undefined) delete process.env.LEVER_BOARDS;
    else process.env.LEVER_BOARDS = original;
    jest.clearAllMocks();
  });

  it('fetches the built-in boards when LEVER_BOARDS is unset', async () => {
    delete process.env.LEVER_BOARDS;
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });
    const monitor = new LeverMonitorService({} as any, {} as any);
    await monitor.run();
    expect((axios.get as jest.Mock).mock.calls.map((call) => call[0])).toEqual([
      'https://api.lever.co/v0/postings/wattpad?mode=json',
      'https://api.lever.co/v0/postings/spotify?mode=json',
    ]);
  });
});
