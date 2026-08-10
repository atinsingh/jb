import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerApiKey,
  EmployerApiKeyDocument,
} from './schemas/employer-api-key.schema';
import {
  EmployerWebhook,
  EmployerWebhookDocument,
} from './schemas/employer-webhook.schema';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class EmployerDeveloperService {
  constructor(
    @InjectModel(EmployerApiKey.name)
    private apiKeyModel: Model<EmployerApiKeyDocument>,
    @InjectModel(EmployerWebhook.name)
    private webhookModel: Model<EmployerWebhookDocument>,
  ) {}

  async listKeys(ownerId: string): Promise<EmployerApiKeyDocument[]> {
    return this.apiKeyModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createKey(
    ownerId: string,
    dto: CreateApiKeyDto,
  ): Promise<EmployerApiKeyDocument> {
    const env = dto.env || 'live';
    // Cryptographically-random token. The prefix is stored/displayed; the full
    // secret is returned once at creation and never fabricated.
    const prefixBytes = randomBytes(4).toString('hex'); // 8 hex chars
    const secretBytes = randomBytes(24).toString('hex'); // 48 hex chars
    const keyPrefix = `jbk_${env}_${prefixBytes}`;
    const secret = `${keyPrefix}_${secretBytes}`;
    return this.apiKeyModel.create({
      ownerId: new Types.ObjectId(ownerId),
      name: dto.name,
      env,
      keyPrefix,
      secret,
      scopes: dto.scopes || [],
      lastUsedAt: null,
    });
  }

  async deleteKey(ownerId: string, id: string): Promise<{ deleted: boolean }> {
    const result = await this.apiKeyModel
      .deleteOne({ _id: id, ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('API key not found');
    }
    return { deleted: true };
  }

  async listWebhooks(ownerId: string): Promise<EmployerWebhookDocument[]> {
    return this.webhookModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createWebhook(
    ownerId: string,
    dto: CreateWebhookDto,
  ): Promise<EmployerWebhookDocument> {
    return this.webhookModel.create({
      ownerId: new Types.ObjectId(ownerId),
      url: dto.url,
      status: 'active',
      events: dto.events || [],
      deliveries: [],
    });
  }

  async deleteWebhook(
    ownerId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const result = await this.webhookModel
      .deleteOne({ _id: id, ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Webhook not found');
    }
    return { deleted: true };
  }
}
