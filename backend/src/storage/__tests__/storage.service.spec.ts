import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { StorageService } from '../storage.service';
import { LocalDriver } from '../drivers/local.driver';
import { S3Driver } from '../drivers/s3.driver';

/** Build a StorageService with a ConfigService mocked from a plain map. */
async function buildService(config: Record<string, any>): Promise<StorageService> {
  const mockConfigService: Partial<ConfigService> = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      return key in config ? config[key] : defaultValue;
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      StorageService,
      { provide: ConfigService, useValue: mockConfigService },
    ],
  }).compile();

  return module.get<StorageService>(StorageService);
}

describe('StorageService', () => {
  it('defaults to the local driver when STORAGE_DRIVER is unset', async () => {
    const service = await buildService({});
    expect(service.getDriverName()).toBe('local');
    expect((service as any).driver).toBeInstanceOf(LocalDriver);
  });

  it('selects the local driver when STORAGE_DRIVER=local', async () => {
    const service = await buildService({ STORAGE_DRIVER: 'local' });
    expect(service.getDriverName()).toBe('local');
    expect((service as any).driver).toBeInstanceOf(LocalDriver);
  });

  it('selects the s3 driver when STORAGE_DRIVER=s3', async () => {
    const service = await buildService({
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'my-bucket',
      S3_REGION: 'us-east-1',
    });
    expect(service.getDriverName()).toBe('s3');
    expect((service as any).driver).toBeInstanceOf(S3Driver);
  });

  it('is case-insensitive for the driver name', async () => {
    const service = await buildService({ STORAGE_DRIVER: 'S3', S3_REGION: 'us-east-1' });
    expect(service.getDriverName()).toBe('s3');
  });

  describe('delegation to the local driver (end-to-end)', () => {
    let basePath: string;
    let service: StorageService;

    beforeEach(async () => {
      basePath = await fs.mkdtemp(join(tmpdir(), 'jobocate-svc-'));
      service = await buildService({
        STORAGE_DRIVER: 'local',
        STORAGE_LOCAL_PATH: basePath,
        PUBLIC_BASE_URL: 'http://cdn.test',
      });
    });

    afterEach(async () => {
      await fs.rm(basePath, { recursive: true, force: true });
    });

    it('put/getBuffer/exists/delete/getSignedUrl all delegate correctly', async () => {
      const key = 'cover-letters/cl-1.pdf';
      const buf = Buffer.from('cover-letter-bytes');

      const put = await service.put(key, buf, { contentType: 'application/pdf' });
      expect(put.url).toBe('http://cdn.test/uploads/cover-letters/cl-1.pdf');

      expect((await service.getBuffer(key)).equals(buf)).toBe(true);
      expect(await service.exists(key)).toBe(true);
      expect(await service.getSignedUrl(key)).toBe(
        'http://cdn.test/uploads/cover-letters/cl-1.pdf',
      );

      await service.delete(key);
      expect(await service.exists(key)).toBe(false);
    });
  });
});
