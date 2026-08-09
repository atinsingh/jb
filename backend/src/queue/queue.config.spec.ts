import { bullRootImports, bullQueueImports, buildRedisOptions } from './queue.config';
import { isQueueEnabled } from './queue.constants';

describe('queue.config graceful degradation', () => {
  const original = process.env.QUEUE_ENABLED;
  afterEach(() => {
    if (original === undefined) delete process.env.QUEUE_ENABLED;
    else process.env.QUEUE_ENABLED = original;
  });

  it('is disabled by default → no Bull imports, no Redis touched', () => {
    delete process.env.QUEUE_ENABLED;
    expect(isQueueEnabled()).toBe(false);
    expect(bullRootImports()).toEqual([]);
    expect(bullQueueImports('pdf')).toEqual([]);
  });

  it('QUEUE_ENABLED=true registers root + feature queue', () => {
    process.env.QUEUE_ENABLED = 'true';
    expect(isQueueEnabled()).toBe(true);
    expect(bullRootImports()).toHaveLength(1);
    expect(bullQueueImports('pdf')).toHaveLength(1);
  });

  describe('buildRedisOptions', () => {
    const cfg = (map: Record<string, any>) =>
      ({ get: (k: string, d?: any) => (map[k] !== undefined ? map[k] : d) }) as any;

    it('uses host/port with fail-fast opts when no REDIS_URL', () => {
      const opts = buildRedisOptions(cfg({}));
      expect(opts).toMatchObject({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
    });

    it('parses REDIS_URL (incl. auth, db, tls) and keeps fail-fast opts', () => {
      const opts = buildRedisOptions(
        cfg({ REDIS_URL: 'rediss://user:pass@redis.example.com:6380/2' }),
      );
      expect(opts).toMatchObject({
        host: 'redis.example.com',
        port: 6380,
        username: 'user',
        password: 'pass',
        db: 2,
        tls: {},
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
    });
  });
});
