import { EmployerAtsSecretCodec } from './employer-ats-secret.codec';

describe('EmployerAtsSecretCodec', () => {
  it('stores virtual keys as authenticated ciphertext and recovers them only server-side', () => {
    const config = {
      get: jest.fn((name: string, fallback?: string) =>
        name === 'AI_VIRTUAL_KEY_ENCRYPTION_KEY'
          ? 'test-only-encryption-secret-with-enough-entropy'
          : fallback,
      ),
    };
    const codec = new EmployerAtsSecretCodec(config as any);

    const ciphertext = codec.encrypt('sk-employer-secret');

    expect(ciphertext).not.toContain('sk-employer-secret');
    expect(codec.decrypt(ciphertext)).toBe('sk-employer-secret');
  });
});
