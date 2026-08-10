import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerConversation,
  EmployerConversationDocument,
} from './schemas/employer-conversation.schema';
import {
  EmployerMessage,
  EmployerMessageDocument,
} from './schemas/employer-message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmployerMessagesService {
  constructor(
    @InjectModel(EmployerConversation.name)
    private conversationModel: Model<EmployerConversationDocument>,
    @InjectModel(EmployerMessage.name)
    private messageModel: Model<EmployerMessageDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listConversations(
    ownerId: string,
  ): Promise<EmployerConversationDocument[]> {
    return this.conversationModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .exec();
  }

  private async getOwnedConversation(
    ownerId: string,
    conversationId: string,
  ): Promise<EmployerConversationDocument> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new NotFoundException('Conversation not found');
    }
    const conversation = await this.conversationModel
      .findOne({
        _id: conversationId,
        ownerId: new Types.ObjectId(ownerId),
      })
      .exec();
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async getMessages(
    ownerId: string,
    conversationId: string,
  ): Promise<{
    conversation: EmployerConversationDocument;
    messages: EmployerMessageDocument[];
  }> {
    const conversation = await this.getOwnedConversation(
      ownerId,
      conversationId,
    );

    const messages = await this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .exec();

    // Opening the thread clears the unread counter for inbound messages.
    if (conversation.unread > 0) {
      await this.messageModel
        .updateMany(
          { conversationId: conversation._id, sender: 'candidate', read: false },
          { $set: { read: true } },
        )
        .exec();
      conversation.unread = 0;
      await conversation.save();
    }

    return { conversation, messages };
  }

  async createConversation(
    ownerId: string,
    dto: CreateConversationDto,
  ): Promise<EmployerConversationDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const conversation = await this.conversationModel.create({
      ownerId: ownerObjectId,
      candidateName: dto.candidateName,
      candidateId: dto.candidateId || '',
      role: dto.role || '',
      lastMessage: '',
      lastMessageAt: null,
      unread: 0,
    });

    const body = (dto.message || '').trim();
    if (body) {
      await this.appendMessage(ownerObjectId, conversation, 'employer', body);
    }

    return conversation;
  }

  async sendMessage(
    ownerId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<EmployerMessageDocument> {
    const conversation = await this.getOwnedConversation(
      ownerId,
      conversationId,
    );
    const message = await this.appendMessage(
      new Types.ObjectId(ownerId),
      conversation,
      'employer',
      dto.body.trim(),
    );

    // Producer: notify the recipient candidate of the new message.
    try {
      if (conversation.candidateId) {
        await this.notificationsService.create({
          audience: 'candidate',
          userId: String(conversation.candidateId),
          type: 'messages',
          text: `New message from ${conversation.role || 'an employer'}`,
          href: '/app/messages',
        });
      }
    } catch {
      /* notifications must never break the messaging flow */
    }

    return message;
  }

  private async appendMessage(
    ownerObjectId: Types.ObjectId,
    conversation: EmployerConversationDocument,
    sender: string,
    body: string,
  ): Promise<EmployerMessageDocument> {
    const message = await this.messageModel.create({
      ownerId: ownerObjectId,
      conversationId: conversation._id,
      sender,
      body,
      read: sender === 'employer',
    });

    conversation.lastMessage = body;
    conversation.lastMessageAt = new Date();
    if (sender === 'candidate') {
      conversation.unread = (conversation.unread || 0) + 1;
    }
    await conversation.save();

    return message;
  }
}
