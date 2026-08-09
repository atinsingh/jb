import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Readable } from 'stream';
import { LocalDriver } from '../drivers/local.driver';

describe('LocalDriver', () => {
  let basePath: string;
  let driver: LocalDriver;

  beforeEach(async () => {
    basePath = await fs.mkdtemp(join(tmpdir(), 'jobocate-storage-'));
    driver = new LocalDriver({
      basePath,
      publicBaseUrl: 'http://localhost:8000',
    });
  });

  afterEach(async () => {
    await fs.rm(basePath, { recursive: true, force: true });
  });

  it('put -> getBuffer round-trips the exact bytes', async () => {
    const key = 'resumes/user-1/resume.pdf';
    const payload = Buffer.from('PDF-BYTES-\x00\x01\x02');

    const result = await driver.put(key, payload, { contentType: 'application/pdf' });

    expect(result.key).toBe(key);
    expect(result.url).toBe('http://localhost:8000/uploads/resumes/user-1/resume.pdf');

    const readBack = await driver.getBuffer(key);
    expect(readBack.equals(payload)).toBe(true);
  });

  it('creates nested directories automatically', async () => {
    const key = 'a/deep/nested/path/file.txt';
    await driver.put(key, Buffer.from('hi'));
    const onDisk = await fs.readFile(join(basePath, key), 'utf8');
    expect(onDisk).toBe('hi');
  });

  it('getStream returns a readable stream of the content', async () => {
    const key = 'stream/file.txt';
    await driver.put(key, Buffer.from('streamed-content'));

    const stream = await driver.getStream(key);
    expect(stream).toBeInstanceOf(Readable);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks).toString()).toBe('streamed-content');
  });

  it('exists returns true for a written key and false otherwise', async () => {
    await driver.put('present.txt', Buffer.from('x'));
    expect(await driver.exists('present.txt')).toBe(true);
    expect(await driver.exists('missing.txt')).toBe(false);
  });

  it('delete removes the object', async () => {
    await driver.put('to-delete.txt', Buffer.from('bye'));
    expect(await driver.exists('to-delete.txt')).toBe(true);

    await driver.delete('to-delete.txt');
    expect(await driver.exists('to-delete.txt')).toBe(false);
  });

  it('delete is a no-op for a missing key (does not throw)', async () => {
    await expect(driver.delete('never-existed.txt')).resolves.toBeUndefined();
  });

  it('getSignedUrl returns the plain public URL', async () => {
    const url = await driver.getSignedUrl('resumes/x.pdf', 60);
    expect(url).toBe('http://localhost:8000/uploads/resumes/x.pdf');
  });

  it('builds a relative URL when no publicBaseUrl is configured', async () => {
    const bare = new LocalDriver({ basePath });
    const result = await bare.put('f.txt', Buffer.from('y'));
    expect(result.url).toBe('/uploads/f.txt');
  });

  it('getBuffer rejects for a missing key', async () => {
    await expect(driver.getBuffer('nope.txt')).rejects.toThrow();
  });

  it('neutralizes path-traversal keys, keeping writes inside the base dir', async () => {
    const escapeTarget = join(basePath, '..', 'evil.txt');
    await driver.put('../../evil.txt', Buffer.from('x'));
    // The traversal must NOT have written outside the base directory.
    await expect(fs.access(escapeTarget)).rejects.toThrow();
    // It should have landed inside the base dir instead.
    expect(await driver.exists('evil.txt')).toBe(true);
  });
});
