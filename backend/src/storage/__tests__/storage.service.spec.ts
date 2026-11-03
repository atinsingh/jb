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

  it('stops production startup when the Supabase bucket stays public', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      if ((init as RequestInit | undefined)?.method === 'PUT') {
        return { ok: true, status: 200 } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ public: true }),
      } as Response;
    });
    try {
      const service = await buildService({
        STORAGE_DRIVER: 's3',
        S3_BUCKET: 'jobocate',
        S3_REGION: 'us-east-1',
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        NODE_ENV: 'production',
      });
      await expect(service.onModuleInit()).rejects.toThrow(/still public/);
    } finally {
      fetchMock.mockRestore();
    }
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

    it('encrypts saved resume PDFs and does not hand back a public upload URL', async () => {
      const sealed = await buildService({
        STORAGE_DRIVER: 'local',
        STORAGE_LOCAL_PATH: basePath,
        PUBLIC_BASE_URL: 'http://cdn.test',
        RESUME_STORAGE_ENCRYPTION_KEY: 'test-only-resume-storage-key',
      });
      const key = 'resumes/r1/1.pdf';
      const buf = Buffer.from('%PDF-1.4 secret resume');

      const put = await sealed.put(key, buf, { contentType: 'application/pdf' });
      const raw = await fs.readFile(join(basePath, 'resumes', 'r1', '1.pdf'));

      expect(put.url).not.toContain('/uploads/');
      expect(put.url).not.toContain('/object/public/');
      expect(raw.includes(Buffer.from('%PDF'))).toBe(false);
      expect((await sealed.getBuffer(key)).equals(buf)).toBe(true);
      expect(await sealed.getSignedUrl(key)).toBe('');
      const stream = await sealed.getStream(key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      expect(Buffer.concat(chunks).equals(buf)).toBe(true);
    });

    it('reads a resume saved before encryption as the original bytes', async () => {
      const key = 'resumes/compare/u1/old.pdf';
      const buf = Buffer.from('%PDF-1.4 already stored');
      await fs.mkdir(join(basePath, 'resumes', 'compare', 'u1'), { recursive: true });
      await fs.writeFile(join(basePath, key), buf);
      const reader = await buildService({
        STORAGE_DRIVER: 'local',
        STORAGE_LOCAL_PATH: basePath,
        RESUME_STORAGE_ENCRYPTION_KEY: 'test-only-resume-storage-key',
      });

      expect((await reader.getBuffer(key)).equals(buf)).toBe(true);
    });
  });
});
