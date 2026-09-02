import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HarnessModelAliasDocument = HydratedDocument<HarnessModelAlias>;

/**
 * One model+effort alias exposed by the LiteLLM proxy, plus the tiers allowed
 * to select it.
 *
 * This collection is the contract that keeps model choice out of code. The
 * proxy's `config.yaml` declares the alias and what it costs; this document
 * declares who may ask for it. Adding a tier or an alias is an insert here and
 * an entry there — no deploy, which is the acceptance criterion.
 *
 * Aliases are namespaced per provider+model+effort and never per harness: cost
 * is a property of the provider serving the call, so a per-harness namespace
 * would triple the config for identical prices. Per-harness reporting comes
 * from the `harness` request tag instead.
 */
@Schema({ timestamps: true, collection: 'harness_model_aliases' })
export class HarnessModelAlias {
  /**
   * The name sent to the proxy as the model. Convention is
   * `<provider>/<model>/<effort>`, but nothing reads its parts — the fields
   * below are authoritative.
   */
  @Prop({ required: true, unique: true, index: true })
  alias: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  model: string;

  /** Reasoning/effort level baked into the alias on the proxy side. */
  @Prop({ required: true })
  effort: string;

  /** Human label shown in the UI next to the session's model. */
  @Prop({ required: true })
  label: string;

  /** Plan types permitted to select this alias. */
  @Prop({ type: [String], default: [], index: true })
  tiers: string[];

  /**
   * Tiers for which this is the alias picked when the caller names none.
   * A tier with several defaults resolves to the lowest `rank`.
   */
  @Prop({ type: [String], default: [] })
  defaultForTiers: string[];

  /**
   * Most output tokens this model accepts in one response, when lower than a
   * harness default. Nova Micro rejects anything over 10,240 outright.
   * Omit when the model needs no ceiling.
   */
  @Prop()
  maxOutputTokens?: number;

  /** Context window; paired with maxOutputTokens for harnesses that need both. */
  @Prop()
  maxInputTokens?: number;

  /** Display and default-selection order; lower sorts first. */
  @Prop({ default: 100 })
  rank: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const HarnessModelAliasSchema =
  SchemaFactory.createForClass(HarnessModelAlias);

HarnessModelAliasSchema.index({ isActive: 1, tiers: 1, rank: 1 });
