import { AiBudgetUnavailableException } from './ai-budget.errors';
import { AiBudgetSecretCodec } from './ai-budget-secret.codec';

describe('AiBudgetSecretCodec', () => {
  const config = {
    get: jest.fn((name: string, fallback?: string) =>
      name === 'AI_VIRTUAL_KEY_ENCRYPTION_KEY'
        ? 'test-only-encryption-secret-with-enough-entropy'
        : fallback,
    ),
  };

  it('uses authenticated AES-256-GCM with a random IV', () => {
    const codec = new AiBudgetSecretCodec(config as any);

    const first = codec.encrypt('sk-candidate-secret');
    const second = codec.encrypt('sk-candidate-secret');

    expect(first).not.toBe(second);
    expect(first).not.toContain('sk-candidate-secret');
    expect(second).not.toContain('sk-candidate-secret');
    expect(codec.decrypt(first)).toBe('sk-candidate-secret');
    expect(codec.decrypt(second)).toBe('sk-candidate-secret');
  });

  it('fails closed when authenticated ciphertext is tampered with', () => {
    const codec = new AiBudgetSecretCodec(config as any);
    const encrypted = codec.encrypt('sk-candidate-secret');
    const parts = encrypted.split('.');
    const payload = Buffer.from(parts[3], 'base64url');
    payload[0] ^= 1;
    parts[3] = payload.toString('base64url');
    const tampered = parts.join('.');

    expect(() => codec.decrypt(tampered)).toThrow(AiBudgetUnavailableException);
  });
});
