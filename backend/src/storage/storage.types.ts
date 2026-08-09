import { Readable } from 'stream';

/**
 * Options accepted when writing an object.
 */
export interface PutOptions {
  /** MIME type stored alongside the object (e.g. 'application/pdf'). */
  contentType?: string;
}

/**
 * Result returned after a successful `put`.
 */
export interface PutResult {
  /** The storage key the object was written under. */
  key: string;
  /** A resolvable URL for the object (public for local, may be public or signed for s3). */
  url: string;
}

/**
 * Swappable object-storage driver contract. Implementations: LocalDriver, S3Driver.
 */
export interface StorageDriver {
  /** Write a buffer under `key`. Creates any intermediate directories/prefixes. */
  put(key: string, buffer: Buffer, options?: PutOptions): Promise<PutResult>;
  /** Read the full object as a Buffer. Rejects if the key does not exist. */
  getBuffer(key: string): Promise<Buffer>;
  /** Open a readable stream for the object. Rejects if the key does not exist. */
  getStream(key: string): Promise<Readable>;
  /** Return a URL for the object, signed with a TTL (seconds) when the driver supports it. */
  getSignedUrl(key: string, ttlSeconds?: number): Promise<string>;
  /** Delete the object. Resolves quietly if the key does not exist. */
  delete(key: string): Promise<void>;
  /** Return true if the object exists. */
  exists(key: string): Promise<boolean>;
}

/** Supported driver identifiers selectable via STORAGE_DRIVER. */
export type StorageDriverName = 'local' | 's3';
