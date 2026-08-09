import { createReadStream, promises as fs } from 'fs';
import { dirname, isAbsolute, join, normalize, sep } from 'path';
import { Readable } from 'stream';
import { PutOptions, PutResult, StorageDriver } from '../storage.types';

export interface LocalDriverConfig {
  /** Base directory files are written under. Defaults to './uploads'. */
  basePath: string;
  /**
   * Optional origin prepended to returned URLs (e.g. 'http://localhost:8000').
   * The public path is always `${publicBaseUrl}/uploads/<key>`.
   */
  publicBaseUrl?: string;
}

/**
 * Filesystem-backed storage driver. Files live under `basePath/<key>` and are
 * served statically at `/uploads/<key>` (see main.ts useStaticAssets wiring).
 */
export class LocalDriver implements StorageDriver {
  private readonly basePath: string;
  private readonly publicBaseUrl: string;

  constructor(config: LocalDriverConfig) {
    this.basePath = config.basePath || './uploads';
    this.publicBaseUrl = (config.publicBaseUrl || '').replace(/\/+$/, '');
  }

  /**
   * Resolve a storage key to an absolute filesystem path, guarding against
   * path traversal (`..`) escaping the base directory.
   */
  private resolvePath(key: string): string {
    const cleanKey = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    const base = isAbsolute(this.basePath)
      ? this.basePath
      : join(process.cwd(), this.basePath);
    const full = join(base, cleanKey);
    const resolvedBase = normalize(base + sep);
    if (!full.startsWith(normalize(resolvedBase)) && full !== normalize(base)) {
      throw new Error(`Invalid storage key (path traversal detected): ${key}`);
    }
    return full;
  }

  /** Build the public URL for a key. */
  private urlFor(key: string): string {
    const normalizedKey = key.split(sep).join('/').replace(/^\/+/, '');
    return `${this.publicBaseUrl}/uploads/${normalizedKey}`;
  }

  async put(key: string, buffer: Buffer, _options?: PutOptions): Promise<PutResult> {
    const full = this.resolvePath(key);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return { key, url: this.urlFor(key) };
  }

  async getBuffer(key: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(key));
  }

  async getStream(key: string): Promise<Readable> {
    const full = this.resolvePath(key);
    // Surface a missing-file error eagerly rather than on first read.
    await fs.access(full);
    return createReadStream(full);
  }

  async getSignedUrl(key: string, _ttlSeconds?: number): Promise<string> {
    // Local files are served statically; there is nothing to sign.
    return this.urlFor(key);
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch (err: any) {
      if (err?.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }
}
