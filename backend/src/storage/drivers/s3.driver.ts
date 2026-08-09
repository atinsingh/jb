import { Readable } from 'stream';
import { PutOptions, PutResult, StorageDriver } from '../storage.types';

export interface S3DriverConfig {
  bucket: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Custom endpoint for S3-compatible stores (MinIO, R2, etc.). */
  endpoint?: string;
  /** Origin used to build public (unsigned) URLs. */
  publicBaseUrl?: string;
  /** Default TTL (seconds) for getSignedUrl. */
  signedUrlTtl?: number;
}

const MISSING_DEP_MESSAGE =
  'install @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner to use the s3 driver';

/**
 * S3 (and S3-compatible) storage driver. The AWS SDK v3 is loaded lazily via
 * dynamic import so this module compiles and loads even when the SDK is not
 * installed — the dependency is only required once the driver is actually used.
 */
export class S3Driver implements StorageDriver {
  private readonly config: S3DriverConfig;
  private clientPromise?: Promise<any>;
  private sdkModule?: any;
  private presignerModule?: any;

  constructor(config: S3DriverConfig) {
    this.config = config;
  }

  /**
   * Lazily load the SDK modules; throw a clear install hint when absent.
   * The module specifiers are passed through a variable so the compiler does
   * not attempt to statically resolve (and fail on) the optional dependency.
   */
  private async loadSdk(): Promise<{ s3: any; presigner: any }> {
    if (!this.sdkModule || !this.presignerModule) {
      const dynamicImport = (name: string): Promise<any> =>
        // eslint-disable-next-line no-new-func
        (Function('m', 'return import(m)') as (m: string) => Promise<any>)(name);
      try {
        this.sdkModule = await dynamicImport('@aws-sdk/client-s3');
        this.presignerModule = await dynamicImport('@aws-sdk/s3-request-presigner');
      } catch {
        throw new Error(MISSING_DEP_MESSAGE);
      }
    }
    return { s3: this.sdkModule, presigner: this.presignerModule };
  }

  /** Build (once) and return a configured S3Client. */
  private async getClient(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { s3 } = await this.loadSdk();
        const opts: any = { region: this.config.region };
        if (this.config.endpoint) {
          opts.endpoint = this.config.endpoint;
          opts.forcePathStyle = true;
        }
        if (this.config.accessKeyId && this.config.secretAccessKey) {
          opts.credentials = {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          };
        }
        return new s3.S3Client(opts);
      })();
    }
    return this.clientPromise;
  }

  private urlFor(key: string): string {
    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async put(key: string, buffer: Buffer, options?: PutOptions): Promise<PutResult> {
    const { s3 } = await this.loadSdk();
    const client = await this.getClient();
    await client.send(
      new s3.PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: options?.contentType,
      }),
    );
    return { key, url: this.urlFor(key) };
  }

  async getBuffer(key: string): Promise<Buffer> {
    const stream = await this.getStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getStream(key: string): Promise<Readable> {
    const { s3 } = await this.loadSdk();
    const client = await this.getClient();
    const res = await client.send(
      new s3.GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    return res.Body as Readable;
  }

  async getSignedUrl(key: string, ttlSeconds?: number): Promise<string> {
    const { s3, presigner } = await this.loadSdk();
    const client = await this.getClient();
    const command = new s3.GetObjectCommand({ Bucket: this.config.bucket, Key: key });
    return presigner.getSignedUrl(client, command, {
      expiresIn: ttlSeconds ?? this.config.signedUrlTtl ?? 3600,
    });
  }

  async delete(key: string): Promise<void> {
    const { s3 } = await this.loadSdk();
    const client = await this.getClient();
    await client.send(
      new s3.DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    const { s3 } = await this.loadSdk();
    const client = await this.getClient();
    try {
      await client.send(
        new s3.HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return true;
    } catch (err: any) {
      const status = err?.$metadata?.httpStatusCode;
      if (status === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchKey') {
        return false;
      }
      throw err;
    }
  }
}

export { MISSING_DEP_MESSAGE };
