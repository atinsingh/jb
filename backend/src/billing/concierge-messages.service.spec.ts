import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConciergeMessagesService } from './concierge-messages.service';

describe('Concierge messages', () => {
  const candidateId = '507f1f77bcf86cd799439011';
  const employerId = '507f1f77bcf86cd799439012';
  const candidate = { _id: new Types.ObjectId(candidateId), role: 'ROLE_CANDIDATE' } as any;
  let bookings: any[];
  let messages: any[];
  let service: ConciergeMessagesService;

  beforeEach(() => {
    bookings = [];
    messages = [];
    service = new ConciergeMessagesService(
      { findOne: async (query) => bookings.find((row) => String(row.candidateId) === String(query.candidateId) && String(row.employerId) === String(query.employerId) && (!query.status?.$in || query.status.$in.includes(row.status))) || null } as any,
      { find: () => ({ sort: () => ({ limit: async () => messages }) }), create: async (doc) => { const row = { _id: new Types.ObjectId(), ...doc, createdAt: new Date('2026-10-28T16:00:00Z') }; messages.push(row); return row; } } as any,
    );
  });

  it('refuses a message until the candidate has paid', async () => {
    await expect(service.send(candidate, employerId, 'Hello')).rejects.toThrow(BadRequestException);
  });

  it('stores a message once a booking exists', async () => {
    bookings.push({ candidateId: new Types.ObjectId(candidateId), employerId: new Types.ObjectId(employerId), status: 'scheduled' });
    const saved = await service.send(candidate, employerId, ' Hello ');
    expect(saved.body).toBe('Hello');
    expect(saved.senderId).toBe(candidateId);
    expect(await service.list(candidate, employerId)).toHaveLength(1);
  });

  it('refuses a message after the payment was returned', async () => {
    bookings.push({ candidateId: new Types.ObjectId(candidateId), employerId: new Types.ObjectId(employerId), status: 'refunded' });
    await expect(service.send(candidate, employerId, 'Hello')).rejects.toThrow(/session/i);
  });
});
