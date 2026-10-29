import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConciergeSession, ConciergeSessionDocument } from './schemas/concierge-session.schema';

@Injectable()
export class ConciergeScheduleService {
  constructor(
    @InjectModel(ConciergeSession.name) private sessionModel: Model<ConciergeSessionDocument>,
  ) {}

  async list(userId: string, side: 'candidate' | 'employer') {
    const filter = side === 'employer' ? { employerId: new Types.ObjectId(userId) } : { candidateId: new Types.ObjectId(userId) };
    const rows = await this.sessionModel.find(filter).sort({ startsAt: 1 }).limit(40);
    return rows.map((row) => ({
      id: row._id.toString(),
      candidateId: row.candidateId.toString(),
      employerId: row.employerId.toString(),
      with: (side === 'employer' ? row.candidateId : row.employerId).toString(),
      startsAt: row.startsAt,
      hours: row.hours,
    }));
  }
}
