import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ResumeVersionDocument = ResumeVersion & Document;

@Schema({ timestamps: true })
export class ResumeVersion {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resume', required: true })
    resumeId: Types.ObjectId;

    @Prop({ required: true })
    version: number;

    @Prop({ type: Object, required: true })
    content: Record<string, any>;

    @Prop({ default: 'Auto-saved version' })
    description: string;

    createdAt?: Date;
    updatedAt?: Date;
}

export const ResumeVersionSchema = SchemaFactory.createForClass(ResumeVersion);
// Create compound index for efficient lookups and uniqueness
ResumeVersionSchema.index({ resumeId: 1, version: 1 }, { unique: true });
