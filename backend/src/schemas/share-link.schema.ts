import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

export type ShareLinkDocument = ShareLink & Document;

@Schema({ timestamps: true })
export class ShareLink {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Resume', required: true })
    resumeId: Types.ObjectId;

    @Prop({ required: true, unique: true })
    slug: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: true })
    isPublic: boolean;

    @Prop()
    passwordHash?: string;

    @Prop()
    expiresAt?: Date;

    @Prop({ default: 0 })
    views: number;

    createdAt?: Date;
    updatedAt?: Date;
}

export const ShareLinkSchema = SchemaFactory.createForClass(ShareLink);
