import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeadDocument = Lead & Document;

export type LeadKind = 'demo' | 'contact';
export type LeadStatus = 'new' | 'contacted' | 'closed';

/**
 * An inbound lead from the public marketing site.
 *
 * Persistence is the point: the demo and contact forms previously rendered a
 * success state without sending anything anywhere, so every inbound lead was
 * discarded. The record is written first and email notification is attempted
 * afterwards on a best-effort basis — a missing or broken SMTP config must
 * never cost us the lead.
 */
@Schema({ timestamps: true, collection: 'leads' })
export class Lead {
  @Prop({ required: true, enum: ['demo', 'contact'], index: true })
  kind: LeadKind;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email: string;

  // --- demo-request fields ---
  @Prop({ trim: true })
  company?: string;

  @Prop({ trim: true })
  companySize?: string;

  @Prop({ trim: true })
  role?: string;

  @Prop({ trim: true })
  hiringVolume?: string;

  // --- contact fields ---
  @Prop({ trim: true })
  subject?: string;

  /** Free-text: the contact message, or "what would you like to see?" on demo. */
  @Prop({ trim: true })
  message?: string;

  @Prop({ enum: ['new', 'contacted', 'closed'], default: 'new', index: true })
  status: LeadStatus;

  /** Whether the notification email actually went out. */
  @Prop({ default: false })
  notified: boolean;

  @Prop({ type: Object, default: {} })
  meta: Record<string, unknown>;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

// Admin list view is "newest first, optionally filtered by kind".
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ kind: 1, createdAt: -1 });
