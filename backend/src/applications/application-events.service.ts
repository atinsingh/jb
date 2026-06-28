import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationEvent, ApplicationEventDocument } from '../schemas/application-event.schema';

@Injectable()
export class ApplicationEventsService {
  constructor(
    @InjectModel(ApplicationEvent.name)
    private eventModel: Model<ApplicationEventDocument>,
  ) {}

  async recordEvent(params: {
    applicationId?: Types.ObjectId;
    userId: Types.ObjectId;
    type: string;
    message?: string;
    meta?: Record<string, any>;
  }) {
    const event = new this.eventModel({
      ...params,
    });
    return event.save();
  }

  async getEventsForUser(
    userId: string,
    opts: { since?: string; limit?: number; skip?: number; type?: string | string[] } = {},
  ) {
    const query: any = { userId: new Types.ObjectId(userId) };
    if (opts.since) {
      query.createdAt = { $gte: new Date(opts.since) };
    }
    if (opts.type) {
      if (Array.isArray(opts.type)) {
        query.type = { $in: opts.type };
      } else {
        query.type = opts.type;
      }
    }
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 100) : 50;
    const skip = opts.skip || 0;
    return this.eventModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }
}
