import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  Reminder,
  ReminderDocument,
  ReminderStatus,
  ReminderType,
} from '../schemas/reminder.schema';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { isQueueEnabled } from '../queue/queue.constants';
import {
  QUEUE_CRON,
  JOB_REMINDERS,
  JOBID_REMINDERS,
  CRON_REMINDERS,
} from '../queue/cron-queue.constants';

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name)
    private reminderModel: Model<ReminderDocument>,
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    // Present only when QUEUE_ENABLED=true; else @Optional → undefined (inline).
    @Optional() @InjectQueue(QUEUE_CRON) private readonly cronQueue?: Queue,
  ) {}

  /** Register the repeatable reminders job with a stable jobId when queues own it. */
  async onModuleInit(): Promise<void> {
    if (!this.cronQueue) return;
    await this.cronQueue.add(
      JOB_REMINDERS,
      {},
      { repeat: { cron: CRON_REMINDERS }, jobId: JOBID_REMINDERS },
    );
  }

  /**
   * Create a reminder
   */
  async createReminder(
    userId: string,
    data: {
      applicationId?: string;
      type: ReminderType;
      title: string;
      description?: string;
      dueDate: Date;
      isRecurring?: boolean;
      recurrencePattern?: string;
    },
  ): Promise<ReminderDocument> {
    const reminder = new this.reminderModel({
      userId,
      ...data,
      status: ReminderStatus.PENDING,
    });

    return reminder.save();
  }

  /**
   * Get reminders for a user
   */
  async getReminders(
    userId: string,
    filters?: {
      status?: ReminderStatus;
      type?: ReminderType;
      dueDateFrom?: Date;
      dueDateTo?: Date;
    },
  ): Promise<ReminderDocument[]> {
    const query: any = { userId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      query.dueDate = {};
      if (filters.dueDateFrom) query.dueDate.$gte = filters.dueDateFrom;
      if (filters.dueDateTo) query.dueDate.$lte = filters.dueDateTo;
    }

    return this.reminderModel
      .find(query)
      .populate('applicationId')
      .sort({ dueDate: 1 })
      .exec();
  }

  /**
   * Update reminder status
   */
  async updateReminderStatus(
    reminderId: string,
    userId: string,
    status: ReminderStatus,
  ): Promise<ReminderDocument | null> {
    const update: any = { status };
    if (status === ReminderStatus.SENT) {
      update.sentAt = new Date();
    } else if (status === ReminderStatus.COMPLETED) {
      update.completedAt = new Date();
    }

    return this.reminderModel
      .findOneAndUpdate({ _id: reminderId, userId }, update, { new: true })
      .exec();
  }

  /**
   * Background job: Process due reminders
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processDueReminders() {
    // Queues own scheduling when enabled → decorator no-ops (avoid double run).
    if (isQueueEnabled()) return;
    return this.runRemindersOnce();
  }

  /**
   * Process due reminders — called by both the @Cron handler (queues off) and
   * the Bull processor (queues on) so both paths do identical work.
   */
  async runRemindersOnce() {
    this.logger.log('Processing due reminders...');

    const now = new Date();
    const dueReminders = await this.reminderModel
      .find({
        status: ReminderStatus.PENDING,
        dueDate: { $lte: now },
      })
      .populate('userId')
      .exec();

    for (const reminder of dueReminders) {
      try {
        // Mark as sent (in a real implementation, send email/notification here)
        reminder.status = ReminderStatus.SENT;
        reminder.sentAt = new Date();
        await reminder.save();

        this.logger.log(`Reminder sent: ${reminder._id} for user ${reminder.userId}`);

        // Handle recurring reminders
        if (reminder.isRecurring && reminder.recurrencePattern) {
          const nextDueDate = this.calculateNextDueDate(
            reminder.dueDate,
            reminder.recurrencePattern,
          );
          await this.createReminder(
            reminder.userId.toString(),
            {
              applicationId: reminder.applicationId?.toString(),
              type: reminder.type,
              title: reminder.title,
              description: reminder.description,
              dueDate: nextDueDate,
              isRecurring: true,
              recurrencePattern: reminder.recurrencePattern,
            },
          );
        }
      } catch (error) {
        this.logger.error(`Error processing reminder ${reminder._id}:`, error);
      }
    }

    this.logger.log(`Processed ${dueReminders.length} reminders`);
  }

  /**
   * Calculate next due date for recurring reminder
   */
  private calculateNextDueDate(currentDate: Date, pattern: string): Date {
    const next = new Date(currentDate);

    switch (pattern.toLowerCase()) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        next.setDate(next.getDate() + 1); // Default to daily
    }

    return next;
  }

  /**
   * Auto-create reminders for applications
   */
  async createApplicationReminders(applicationId: string, userId: string): Promise<void> {
    // Create follow-up reminder (7 days after application)
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);

    await this.createReminder(userId, {
      applicationId,
      type: ReminderType.FOLLOW_UP,
      title: 'Follow up on application',
      description: 'Consider following up on your application',
      dueDate: followUpDate,
    });

    this.logger.log(`Created follow-up reminder for application ${applicationId}`);
  }
}

