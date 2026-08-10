import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { EmployerMessagesService } from './employer-messages.service';
import { EmployerConversation } from './schemas/employer-conversation.schema';
import { EmployerMessage } from './schemas/employer-message.schema';
import { NotificationsService } from '../notifications/notifications.service';

const OWNER = new Types.ObjectId().toHexString();
const CONV = new Types.ObjectId().toHexString();
const CAND = 'cand-42';

describe('EmployerMessagesService.sendMessage (notification producer)', () => {
  let service: EmployerMessagesService;

  const conversation: any = {
    _id: CONV,
    ownerId: new Types.ObjectId(OWNER),
    candidateId: CAND,
    role: 'Acme',
    unread: 0,
    lastMessage: '',
    save: jest.fn().mockResolvedValue({}),
  };

  const conversationModel: any = { findOne: jest.fn() };
  const messageModel: any = { create: jest.fn() };
  const notificationsService = { create: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerMessagesService,
        { provide: getModelToken(EmployerConversation.name), useValue: conversationModel },
        { provide: getModelToken(EmployerMessage.name), useValue: messageModel },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get<EmployerMessagesService>(EmployerMessagesService);

    conversationModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(conversation) });
    messageModel.create.mockResolvedValue({ _id: 'm1', body: 'hi' });
    conversation.save.mockClear();
  });

  afterEach(() => jest.clearAllMocks());

  it('notifies the recipient candidate of the new message', async () => {
    await service.sendMessage(OWNER, CONV, { body: 'hello there' } as any);

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: 'candidate',
        userId: CAND,
        type: 'messages',
      }),
    );
  });

  it('skips the notification when the conversation has no candidateId', async () => {
    conversationModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...conversation, candidateId: '' }),
    });

    await service.sendMessage(OWNER, CONV, { body: 'hi' } as any);

    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('swallows a notification error and still returns the message', async () => {
    notificationsService.create.mockRejectedValueOnce(new Error('notif down'));

    await expect(
      service.sendMessage(OWNER, CONV, { body: 'hi' } as any),
    ).resolves.toEqual({ _id: 'm1', body: 'hi' });
  });
});
