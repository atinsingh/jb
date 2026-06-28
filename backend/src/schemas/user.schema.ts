import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Document } from 'mongoose';

// Define types locally
export type UserRole = 'ROLE_CANDIDATE' | 'ROLE_EMPLOYER' | 'ROLE_AGENT' | 'ROLE_ADMIN';
export type AuthProvider = 'local' | 'google' | 'linkedin';
export type PlanType = 'FREE' | 'PRO' | 'ELITE' | 'INTERVIEW';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc: any, ret: Record<string, any>) => {
      ret.id = ret._id?.toString?.() ?? ret._id;
      delete ret._id;
      delete ret.__v;
      if (ret.password !== undefined) {
        delete ret.password;
      }
      return ret;
    },
  },
})
export class User {
  @Prop()
  name?: string;

  @Prop({ unique: true, required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ select: false })
  password?: string;

  @Prop()
  googleId?: string;

  @Prop()
  linkedinId?: string;

  @Prop()
  picture?: string;

  @Prop({ enum: ['local', 'google', 'linkedin'], default: 'local' })
  provider: AuthProvider;

  @Prop({ enum: ['ROLE_CANDIDATE', 'ROLE_EMPLOYER', 'ROLE_AGENT', 'ROLE_ADMIN'], default: 'ROLE_CANDIDATE' })
  role: UserRole;

  // Profile info
  @Prop()
  phone?: string;

  @Prop()
  location?: string;

  @Prop()
  summary?: string;

  @Prop([{ type: String }])
  skills?: string[];

  @Prop([{
    title: String,
    company: String,
    location: String,
    startDate: String,
    endDate: String,
    current: Boolean,
    description: String,
    achievements: [String],
  }])
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
  }>;

  @Prop([{
    degree: String,
    institution: String,
    location: String,
    startDate: String,
    endDate: String,
    gpa: String,
    description: String,
  }])
  education?: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
    description?: string;
  }>;

  // Subscription info (denormalized for quick access)
  @Prop({ enum: ['FREE', 'PRO', 'ELITE', 'INTERVIEW'], default: 'FREE' })
  currentPlanType?: PlanType;

  // Legacy package field (alias for currentPlanType)
  @Prop({ enum: ['free', 'pro', 'elite', 'interview'], default: 'free' })
  package?: string;

  @Prop({ type: Types.ObjectId, ref: 'UserSubscription' })
  subscriptionId?: Types.ObjectId;

  @Prop({ enum: ['active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid', 'paused'] })
  subscriptionStatus?: SubscriptionStatus;

  @Prop()
  stripeCustomerId?: string;

  // Agent-specific fields
  @Prop({ default: 0 })
  assignedCandidatesCount?: number;

  // Status
  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  // Password reset
  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  // Email verification
  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  // Settings (embedded document)
  @Prop({
    type: {
      emailNotifications: {
        jobAlerts: { type: Boolean, default: true },
        applicationUpdates: { type: Boolean, default: true },
        newsletter: { type: Boolean, default: false },
        marketing: { type: Boolean, default: false },
      },
      privacy: {
        profileVisible: { type: Boolean, default: true },
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false },
      },
      preferences: {
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'UTC' },
      },
    },
    default: {},
  })
  settings?: {
    emailNotifications?: {
      jobAlerts?: boolean;
      applicationUpdates?: boolean;
      newsletter?: boolean;
      marketing?: boolean;
    };
    privacy?: {
      profileVisible?: boolean;
      showEmail?: boolean;
      showPhone?: boolean;
    };
    preferences?: {
      theme?: 'light' | 'dark' | 'system';
      language?: string;
      timezone?: string;
    };
  };
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ linkedinId: 1 }, { sparse: true });
UserSchema.index({ role: 1 });
UserSchema.index({ currentPlanType: 1 });
UserSchema.index({ stripeCustomerId: 1 }, { sparse: true });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

