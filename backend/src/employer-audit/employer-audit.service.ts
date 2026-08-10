import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerAuditEvent,
  EmployerAuditEventDocument,
} from './schemas/employer-audit-event.schema';
import {
  EmployerDataRequest,
  EmployerDataRequestDocument,
} from './schemas/employer-data-request.schema';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { CreateDataRequestDto } from './dto/create-data-request.dto';

@Injectable()
export class EmployerAuditService {
  constructor(
    @InjectModel(EmployerAuditEvent.name)
    private eventModel: Model<EmployerAuditEventDocument>,
    @InjectModel(EmployerDataRequest.name)
    private requestModel: Model<EmployerDataRequestDocument>,
  ) {}

  async listEvents(
    ownerId: string,
    category?: string,
    ai?: string,
    search?: string,
  ): Promise<{ events: EmployerAuditEventDocument[] }> {
    const ownerObjectId = new Types.ObjectId(ownerId);

    const query: any = { ownerId: ownerObjectId };
    if (category) {
      query.category = category;
    }
    if (ai === 'true') {
      query.ai = true;
    } else if (ai === 'false') {
      query.ai = false;
    }
    if (search) {
      const rx = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      query.$or = [{ actor: rx }, { action: rx }, { target: rx }];
    }

    const events = await this.eventModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    return { events };
  }

  async createEvent(
    ownerId: string,
    dto: CreateAuditEventDto,
  ): Promise<EmployerAuditEventDocument> {
    const event = new this.eventModel({
      ownerId: new Types.ObjectId(ownerId),
      actor: dto.actor ?? '',
      actorRole: dto.actorRole ?? '',
      ai: dto.ai ?? false,
      action: dto.action,
      target: dto.target ?? '',
      category: dto.category ?? '',
      ip: dto.ip ?? '',
    });
    return event.save();
  }

  async getCompliance(ownerId: string): Promise<{
    requests: EmployerDataRequestDocument[];
    consents: Array<{ label: string; detail: string }>;
    retention: Array<{ label: string; value: string }>;
  }> {
    const ownerObjectId = new Types.ObjectId(ownerId);

    const requests = await this.requestModel
      .find({ ownerId: ownerObjectId })
      .sort({ requestedAt: -1 })
      .exec();

    // Consent ledger and retention policy are owner-configured; until the
    // owner sets them there is nothing to report. No fabricated defaults.
    return { requests, consents: [], retention: [] };
  }

  async createRequest(
    ownerId: string,
    dto: CreateDataRequestDto,
  ): Promise<EmployerDataRequestDocument> {
    const request = new this.requestModel({
      ownerId: new Types.ObjectId(ownerId),
      name: dto.name,
      type: dto.type,
      detail: dto.detail ?? '',
      status: 'pending',
      requestedAt: new Date(),
    });
    return request.save();
  }

  async updateRequestStatus(
    ownerId: string,
    id: string,
    status: string,
  ): Promise<EmployerDataRequestDocument> {
    const request = await this.requestModel
      .findOne({ _id: id, ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (!request) {
      throw new NotFoundException('Data request not found');
    }
    request.status = status;
    return request.save();
  }
}
