import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const MAGIC = Buffer.from('JBP1');

/** Saved résumé artifacts. These never use a public object URL. */
export function isPrivateResumeKey(key: string): boolean {
  const head = key.replace(/\\/g, '/').replace(/^\/+/, '').split('/')[0]?.toLowerCase();
  return head === 'resumes' || head === 'resume-harness';
}

function keyMaterial(secret: string): Buffer {
  if (!secret) {
    throw new Error('RESUME_STORAGE_ENCRYPTION_KEY is required to store resumes');
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

/** AES-256-GCM envelope: magic || iv || tag || ciphertext. */
export function sealResumeObject(plain: Buffer, secret: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyMaterial(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

export function openResumeObject(stored: Buffer, secret: string): Buffer {
  if (
    stored.length < MAGIC.length + 12 + 16 ||
    !stored.subarray(0, MAGIC.length).equals(MAGIC)
  ) {
    throw new Error('Stored resume is not encrypted');
  }
  const iv = stored.subarray(4, 16);
  const tag = stored.subarray(16, 32);
  const data = stored.subarray(32);
  const decipher = createDecipheriv('aes-256-gcm', keyMaterial(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
