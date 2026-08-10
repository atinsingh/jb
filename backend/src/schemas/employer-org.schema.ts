import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type EmployerOrgDocument = EmployerOrg & Document;

@Schema({ timestamps: true })
export class EmployerOrg {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  ownerId: Types.ObjectId;

  @Prop({ default: '' })
  companyName?: string;

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        email: String,
        name: String,
        role: {
          type: String,
          enum: ['admin', 'recruiter', 'hiring_manager', 'interviewer'],
        },
        status: {
          type: String,
          enum: ['active', 'invited'],
          default: 'active',
        },
        lastActiveAt: Date,
      },
    ],
    default: [],
  })
  members?: Array<{
    userId?: Types.ObjectId;
    email?: string;
    name?: string;
    role?: string;
    status?: string;
    lastActiveAt?: Date;
  }>;

  @Prop({
    type: [
      {
        email: String,
        role: String,
        invitedAt: Date,
      },
    ],
    default: [],
  })
  invites?: Array<{
    email?: string;
    role?: string;
    invitedAt?: Date;
  }>;
}

export const EmployerOrgSchema = SchemaFactory.createForClass(EmployerOrg);

// ownerId already has a unique index via @Prop({ unique: true }).
