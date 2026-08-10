import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailService } from '../common/services/email.service';
import { Lead, LeadDocument, LeadKind } from './schemas/lead.schema';

export interface LeadMeta {
  ip?: string;
  userAgent?: string;
  referer?: string;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Persist the lead, then try to notify sales. The write is what matters —
   * notification failures are logged and swallowed so a misconfigured SMTP
   * server can never turn into a lost lead or a 500 back to the visitor.
   */
  async create(
    kind: LeadKind,
    payload: Partial<Lead>,
    meta: LeadMeta = {},
  ): Promise<{ id: string }> {
    const lead = await this.leadModel.create({
      ...payload,
      kind,
      status: 'new',
      notified: false,
      meta,
    });

    this.logger.log(`New ${kind} lead ${lead._id} from ${payload.email}`);

    try {
      const sent = await this.emailService.sendLeadNotification({
        kind,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        companySize: lead.companySize,
        role: lead.role,
        hiringVolume: lead.hiringVolume,
        subject: lead.subject,
        message: lead.message,
      });
      if (sent) {
        await this.leadModel.updateOne({ _id: lead._id }, { $set: { notified: true } });
      } else {
        this.logger.warn(
          `Lead ${lead._id} stored but not emailed (SMTP not configured) — retrieve via GET /api/leads`,
        );
      }
    } catch (error) {
      // Deliberately non-fatal — the lead is already safely stored.
      this.logger.warn(
        `Lead ${lead._id} stored but notification failed: ${(error as Error).message}`,
      );
    }

    return { id: String(lead._id) };
  }

  async list(kind?: LeadKind, limit = 100): Promise<Lead[]> {
    const filter = kind ? { kind } : {};
    return this.leadModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 500))
      .lean()
      .exec() as unknown as Promise<Lead[]>;
  }
}
