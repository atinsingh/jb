import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { LocalDriver } from './drivers/local.driver';
import { S3Driver } from './drivers/s3.driver';
import {
  isPrivateResumeKey,
  openResumeObject,
  sealResumeObject,
} from './resume-object.codec';
import {
  PutOptions,
  PutResult,
  StorageDriver,
  StorageDriverName,
} from './storage.types';

/**
 * Facade over a configured {@link StorageDriver}. The concrete driver
 * (`local` | `s3`) is selected from configuration at construction time, so
 * call-sites depend only on this service and never on a specific backend.
 */
@Injectable()
export class StorageService implements StorageDriver {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;
  private readonly driverName: StorageDriverName;
  private readonly resumeStorageKey: string;

  constructor(private readonly configService: ConfigService) {
    this.driverName = (
      this.configService.get<string>('STORAGE_DRIVER', 'local') || 'local'
    ).toLowerCase() as StorageDriverName;
    this.driver = this.createDriver(this.driverName);
    this.resumeStorageKey =
      this.configService.get<string>('RESUME_STORAGE_ENCRYPTION_KEY', '') || '';
    this.logger.log(`Storage driver initialized: ${this.driverName}`);
  }

  /** Which driver is active ('local' | 's3'). */
  getDriverName(): StorageDriverName {
    return this.driverName;
  }

  private createDriver(name: StorageDriverName): StorageDriver {
    if (name === 's3') {
      return new S3Driver({
        bucket: this.configService.get<string>('S3_BUCKET'),
        region: this.configService.get<string>('S3_REGION'),
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY'),
        endpoint: this.configService.get<string>('S3_ENDPOINT'),
        signedUrlTtl: Number(
          this.configService.get<string>('S3_SIGNED_URL_TTL', '3600'),
        ),
      });
    }
    // Default: local filesystem driver.
    return new LocalDriver({
      basePath: this.configService.get<string>('STORAGE_LOCAL_PATH', './uploads'),
      publicBaseUrl: this.configService.get<string>('PUBLIC_BASE_URL', ''),
    });
  }

  async put(key: string, buffer: Buffer, options?: PutOptions): Promise<PutResult> {
    if (!isPrivateResumeKey(key)) return this.driver.put(key, buffer, options);
    const stored = await this.driver.put(key, sealResumeObject(buffer, this.resumeStorageKey), {
      ...options,
      contentType: 'application/octet-stream',
    });
    return { key: stored.key, url: '' };
  }

  async getBuffer(key: string): Promise<Buffer> {
    const stored = await this.driver.getBuffer(key);
    return isPrivateResumeKey(key) ? openResumeObject(stored, this.resumeStorageKey) : stored;
  }

  async getStream(key: string): Promise<Readable> {
    if (!isPrivateResumeKey(key)) return this.driver.getStream(key);
    return Readable.from(await this.getBuffer(key));
  }

  getSignedUrl(key: string, ttlSeconds?: number): Promise<string> {
    if (isPrivateResumeKey(key)) return Promise.resolve('');
    return this.driver.getSignedUrl(key, ttlSeconds);
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }
}
