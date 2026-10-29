import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDocument } from '../schemas/user.schema';
import { ConciergeBooking, ConciergeBookingDocument } from './schemas/concierge-booking.schema';
import { ConciergeMessage, ConciergeMessageDocument } from './schemas/concierge-message.schema';

export function conciergeRoom(a: string, b: string) {
  return `concierge:${[a, b].sort().join(':')}`;
}

@Injectable()
export class ConciergeMessagesService {
  private emit: ((candidateId: string, employerId: string, message: Record<string, unknown>) => void) | null = null;

  constructor(
    @InjectModel(ConciergeBooking.name) private bookingModel: Model<ConciergeBookingDocument>,
    @InjectModel(ConciergeMessage.name) private messageModel: Model<ConciergeMessageDocument>,
  ) {}

  bind(emit: ConciergeMessagesService['emit']) {
    this.emit = emit;
  }

  async list(user: UserDocument, otherId: string) {
    const pair = await this.pair(user, otherId);
    const rows = await this.messageModel.find(pair).sort({ createdAt: 1 }).limit(100);
    return rows.map((row) => this.toDto(row, user._id.toString()));
  }

  async send(user: UserDocument, otherId: string, body: string) {
    const text = body?.trim();
    if (!text || text.length > 2000) throw new BadRequestException('Message must be 1 to 2000 characters');
    const pair = await this.pair(user, otherId);
    const row = await this.messageModel.create({ ...pair, senderId: user._id, body: text });
    const message = this.toDto(row, user._id.toString());
    this.emit?.(pair.candidateId.toString(), pair.employerId.toString(), message);
    return message;
  }

  private async pair(user: UserDocument, otherId: string) {
    const me = user._id.toString();
    if (!Types.ObjectId.isValid(otherId) || me === otherId) throw new BadRequestException('You cannot message yourself');
    const employer = user.role === 'ROLE_EMPLOYER' || user.role === 'ROLE_ADMIN';
    const candidateId = employer ? otherId : me;
    const employerId = employer ? me : otherId;
    if (!employer && user.role !== 'ROLE_CANDIDATE') throw new BadRequestException('Only a candidate or concierge can use these messages');
    const paid = await this.bookingModel.findOne({
      candidateId: new Types.ObjectId(candidateId),
      employerId: new Types.ObjectId(employerId),
      status: { $in: ['unscheduled', 'scheduled', 'paid'] },
    });
    if (!paid) throw new BadRequestException('Pay for a session before messaging this concierge');
    return { candidateId: new Types.ObjectId(candidateId), employerId: new Types.ObjectId(employerId) };
  }

  private toDto(row: ConciergeMessageDocument, userId: string) {
    return {
      id: row._id.toString(),
      candidateId: row.candidateId.toString(),
      employerId: row.employerId.toString(),
      senderId: row.senderId.toString(),
      mine: row.senderId.toString() === userId,
      body: row.body,
      createdAt: (row as ConciergeMessageDocument & { createdAt?: Date }).createdAt,
    };
  }
}
