import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { AiBudgetUnavailableException } from './ai-budget.errors';

@Injectable()
export class AiBudgetSecretCodec {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string): string {
    try {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
      const encrypted = Buffer.concat([
        cipher.update(value, 'utf8'),
        cipher.final(),
      ]);
      return [
        'v1',
        iv.toString('base64url'),
        cipher.getAuthTag().toString('base64url'),
        encrypted.toString('base64url'),
      ].join('.');
    } catch (error) {
      if (error instanceof AiBudgetUnavailableException) throw error;
      throw new AiBudgetUnavailableException(error);
    }
  }

  decrypt(value: string): string {
    try {
      const [version, iv, tag, payload] = value.split('.');
      if (version !== 'v1' || !iv || !tag || !payload) {
        throw new Error('Invalid encrypted AI budget key');
      }
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(payload, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      if (error instanceof AiBudgetUnavailableException) throw error;
      throw new AiBudgetUnavailableException(error);
    }
  }

  private key(): Buffer {
    const secret =
      this.config.get<string>('AI_VIRTUAL_KEY_ENCRYPTION_KEY', '') ||
      this.config.get<string>('LITELLM_MASTER_KEY', '') ||
      '';
    if (!secret) throw new AiBudgetUnavailableException();
    return createHash('sha256').update(secret, 'utf8').digest();
  }
}
