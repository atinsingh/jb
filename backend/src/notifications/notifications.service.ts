import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmployerNotification,
  EmployerNotificationDocument,
} from '../employer-notifications/schemas/employer-notification.schema';
import {
  CandidateNotification,
  CandidateNotificationDocument,
} from './schemas/candidate-notification.schema';

export type NotificationAudience = 'employer' | 'candidate';

export interface CreateNotificationInput {
  audience: NotificationAudience;
  userId: string;
  type: string;
  text: string;
  href?: string;
  tag?: string;
  ai?: boolean;
  group?: string;
}

/**
 * Global producer + candidate reader for notifications.
 *
 * `create` is the single entry point shared/producer services call when an
 * event happens (application moved, offer sent, message received, ...). It must
 * NEVER throw to the caller — a failed notification write must not roll back or
 * break the business action that triggered it.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(EmployerNotification.name)
    private readonly employerModel: Model<EmployerNotificationDocument>,
    @InjectModel(CandidateNotification.name)
    private readonly candidateModel: Model<CandidateNotificationDocument>,
  ) {}

  /**
   * Write a notification for either audience. Swallows all errors (logs them).
   * Returns the created doc on success, or undefined if the write failed.
   */
  async create(input: CreateNotificationInput): Promise<any | void> {
    const {
      audience,
      userId,
      type,
      text,
      href = '',
      tag = '',
      ai = false,
      group = 'today',
    } = input;

    try {
      if (audience === 'employer') {
        return await this.employerModel.create({
          ownerId: userId,
          type,
          text,
          href,
          tag,
          ai,
          group,
        });
      }
      return await this.candidateModel.create({
        userId,
        type,
        text,
        href,
        tag,
        ai,
        group,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write ${audience} notification for user ${userId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return undefined;
    }
  }

  /* ------------------------------------------------ candidate reads --- */

  async countUnread(userId: string): Promise<number> {
    return this.candidateModel.countDocuments({ userId, read: false }).exec();
  }

  async list(
    userId: string,
    type?: string,
  ): Promise<{
    notifications: CandidateNotificationDocument[];
    unread: number;
  }> {
    const query: any = { userId };
    if (type && type !== 'all') {
      query.type = type;
    }

    const notifications = await this.candidateModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    const unread = await this.countUnread(userId);

    return { notifications, unread };
  }

  async markAllRead(userId: string): Promise<{ unread: number }> {
    await this.candidateModel
      .updateMany({ userId, read: false }, { $set: { read: true } })
      .exec();
    return { unread: 0 };
  }

  async markRead(
    userId: string,
    id: string,
  ): Promise<CandidateNotificationDocument> {
    const notification = await this.candidateModel
      .findOne({ _id: id, userId })
      .exec();
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.read = true;
    return notification.save();
  }
}
