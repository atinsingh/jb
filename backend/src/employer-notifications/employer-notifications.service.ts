import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmployerNotification,
  EmployerNotificationDocument,
} from './schemas/employer-notification.schema';

@Injectable()
export class EmployerNotificationsService {
  constructor(
    @InjectModel(EmployerNotification.name)
    private notificationModel: Model<EmployerNotificationDocument>,
  ) {}

  async create(input: {
    ownerId: string;
    type: string;
    text: string;
    href?: string;
    tag?: string;
    ai?: boolean;
    group?: string;
  }): Promise<EmployerNotificationDocument> {
    const {
      ownerId,
      type,
      text,
      href = '',
      tag = '',
      ai = false,
      group = 'today',
    } = input;
    return this.notificationModel.create({
      ownerId,
      type,
      text,
      href,
      tag,
      ai,
      group,
    });
  }

  async countUnread(ownerId: string): Promise<number> {
    return this.notificationModel.countDocuments({ ownerId, read: false }).exec();
  }

  async list(
    ownerId: string,
    type?: string,
  ): Promise<{ notifications: EmployerNotificationDocument[]; unread: number }> {
    const query: any = { ownerId };
    if (type && type !== 'all') {
      query.type = type;
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();

    const unread = await this.countUnread(ownerId);

    return { notifications, unread };
  }

  async markAllRead(ownerId: string): Promise<{ unread: number }> {
    await this.notificationModel
      .updateMany({ ownerId, read: false }, { $set: { read: true } })
      .exec();
    return { unread: 0 };
  }

  async markRead(
    ownerId: string,
    id: string,
  ): Promise<EmployerNotificationDocument> {
    const notification = await this.notificationModel
      .findOne({ _id: id, ownerId })
      .exec();
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.read = true;
    return notification.save();
  }
}
