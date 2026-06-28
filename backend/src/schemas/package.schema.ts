import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PackageDocument = Package & Document;

export enum PackageType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum AgentType {
  AI = 'ai',
  HUMAN = 'human',
}

@Schema({ timestamps: true })
export class Package {
  @Prop({ enum: PackageType, required: true })
  type: PackageType;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, default: 0 })
  maxBulkOperations?: number; // Max bulk interest expressions per month

  @Prop({ enum: AgentType, default: AgentType.AI })
  agentType: AgentType; // AI or Human agent

  @Prop({ default: true })
  active?: boolean;

  @Prop({ type: [String], default: [] })
  features?: string[];
}

export const PackageSchema = SchemaFactory.createForClass(Package);

// Package configuration (can be seeded)
export const PACKAGE_CONFIG = {
  [PackageType.FREE]: {
    name: 'Free',
    price: 0,
    maxBulkOperations: 10,
    agentType: AgentType.AI,
    features: ['Basic job matching', 'Limited applications'],
  },
  [PackageType.BASIC]: {
    name: 'Basic',
    price: 29,
    maxBulkOperations: 100,
    agentType: AgentType.AI,
    features: ['Enhanced matching', 'Bulk operations', 'AI agent support'],
  },
  [PackageType.PREMIUM]: {
    name: 'Premium',
    price: 99,
    maxBulkOperations: 500,
    agentType: AgentType.HUMAN,
    features: ['Priority matching', 'Unlimited bulk operations', 'Human agent support'],
  },
  [PackageType.ENTERPRISE]: {
    name: 'Enterprise',
    price: 299,
    maxBulkOperations: -1, // Unlimited
    agentType: AgentType.HUMAN,
    features: ['Dedicated agent', 'Unlimited everything', 'Priority support'],
  },
};

