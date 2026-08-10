import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerIntegration,
  EmployerIntegrationDocument,
} from './schemas/employer-integration.schema';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

// Marketplace catalog: the integrations the product offers. This is
// definitional config, not per-owner data. Connection state, sync counts and
// timestamps are real and start empty for every owner.
const INTEGRATION_CATALOG = [
  { integrationId: 'greenhouse', name: 'Greenhouse', category: 'ats' },
  { integrationId: 'google-calendar', name: 'Google Calendar', category: 'calendar' },
  { integrationId: 'slack', name: 'Slack', category: 'comms' },
  { integrationId: 'linkedin', name: 'LinkedIn', category: 'distribution' },
  { integrationId: 'indeed', name: 'Indeed', category: 'distribution' },
  { integrationId: 'workday', name: 'Workday', category: 'hris' },
  { integrationId: 'docusign', name: 'DocuSign', category: 'esign' },
];

@Injectable()
export class EmployerIntegrationsService {
  constructor(
    @InjectModel(EmployerIntegration.name)
    private integrationModel: Model<EmployerIntegrationDocument>,
  ) {}

  async list(ownerId: string): Promise<Array<Record<string, unknown>>> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const stored = await this.integrationModel
      .find({ ownerId: ownerObjectId })
      .exec();
    const byId = new Map(stored.map((i) => [i.integrationId, i]));

    // Merge catalog with the owner's real connection state. Anything the owner
    // has never connected reports as disconnected with zero syncs.
    return INTEGRATION_CATALOG.map((cat) => {
      const doc = byId.get(cat.integrationId);
      return {
        integrationId: cat.integrationId,
        name: cat.name,
        category: cat.category,
        connected: doc?.connected ?? false,
        syncStatus: doc?.syncStatus ?? 'idle',
        authDate: doc?.authDate ?? null,
        lastSync: doc?.lastSync ?? null,
        syncCount: doc?.syncCount ?? 0,
        frequency: doc?.frequency ?? 'realtime',
      };
    });
  }

  async connect(
    ownerId: string,
    integrationId: string,
    dto: ConnectIntegrationDto,
  ): Promise<EmployerIntegrationDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const catalogEntry = INTEGRATION_CATALOG.find(
      (c) => c.integrationId === integrationId,
    );
    // Mark connected and stamp the real authorization time. syncCount/lastSync
    // stay untouched — they only move when a real sync runs.
    const set: any = {
      connected: true,
      authDate: new Date(),
      syncStatus: 'connected',
    };
    if (dto.name) {
      set.name = dto.name;
    }
    if (dto.category) {
      set.category = dto.category;
    }

    return this.integrationModel
      .findOneAndUpdate(
        { ownerId: ownerObjectId, integrationId },
        {
          $set: set,
          $setOnInsert: {
            ownerId: ownerObjectId,
            integrationId,
            name: dto.name || catalogEntry?.name || integrationId,
            category: dto.category || catalogEntry?.category || 'other',
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async disconnect(
    ownerId: string,
    integrationId: string,
  ): Promise<EmployerIntegrationDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    return this.integrationModel
      .findOneAndUpdate(
        { ownerId: ownerObjectId, integrationId },
        { $set: { connected: false, syncStatus: 'idle' } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async update(
    ownerId: string,
    integrationId: string,
    dto: UpdateIntegrationDto,
  ): Promise<EmployerIntegrationDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const set: any = {};
    if (dto.frequency) {
      set.frequency = dto.frequency;
    }

    return this.integrationModel
      .findOneAndUpdate(
        { ownerId: ownerObjectId, integrationId },
        { $set: set },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }
}
