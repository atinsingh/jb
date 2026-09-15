import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  HarnessModelAlias,
  HarnessModelAliasDocument,
} from './schemas/harness-model-alias.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { ModelCapability, ResolvedModelAlias } from './harness/harness.types';
import { isOfferedHarnessAlias } from './offered-alias';

/**
 * Resolves which model+effort alias a signed-in user may run a harness at.
 *
 * Deliberately dumb: it reads the caller's tier and asks the alias collection
 * which aliases that tier permits. There is no table of models here, no effort
 * ladder, and no tier->model branch — `model-alias.service.spec.ts` asserts
 * against this file's own source that none of those literals appear, so adding
 * a tier or an alias stays a data change.
 *
 * Resolution happens on every request rather than at boot, so a plan change
 * takes effect on the next call with no redeploy and no cache to invalidate.
 */

/**
 * The tier assumed when a user has no plan recorded. This is an authentication
 * floor, not a model mapping: which aliases the floor permits is still read
 * from the collection.
 */
const DEFAULT_TIER = 'FREE';

@Injectable()
export class ModelAliasService {
  private readonly logger = new Logger(ModelAliasService.name);

  constructor(
    @InjectModel(HarnessModelAlias.name)
    private readonly aliasModel: Model<HarnessModelAliasDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /** The caller's plan type, read fresh so tier changes apply immediately. */
  async tierFor(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId).lean().exec();
    return (user as any)?.currentPlanType || DEFAULT_TIER;
  }

  /** Every alias the caller's tier permits, best first. */
  async listForUser(userId: string): Promise<ResolvedModelAlias[]> {
    const tier = await this.tierFor(userId);
    return this.listForTier(tier);
  }

  /** Resolve aliases for an already-authoritative tier, such as employer billing. */
  async listForTier(tier: string): Promise<ResolvedModelAlias[]> {
    const docs = await this.aliasModel
      .find({ isActive: true, tiers: tier })
      .sort({ rank: 1, alias: 1 })
      .lean()
      .exec();

    return this.offered(docs).map((d) => this.toResolved(d, tier));
  }

  /** Model families and supported efforts safe to expose in the picker. */
  async capabilitiesForUser(userId: string): Promise<ModelCapability[]> {
    const aliases = await this.listForUser(userId);
    const capabilities: ModelCapability[] = [];

    for (const alias of aliases) {
      let capability = capabilities.find((item) => item.model === alias.model);
      if (!capability) {
        capability = {
          model: alias.model,
          label: alias.modelLabel || alias.model,
          efforts: [],
        };
        capabilities.push(capability);
      }
      if (!capability.efforts.includes(alias.effort)) {
        capability.efforts.push(alias.effort);
      }
    }

    return capabilities;
  }

  /** Resolve a candidate-facing model+effort selection to its private alias. */
  async resolveSelectionForUser(
    userId: string,
    model: string,
    effort: string,
  ): Promise<ResolvedModelAlias> {
    const tier = await this.tierFor(userId);
    const allowed = await this.listForTier(tier);
    const modelAliases = allowed.filter((alias) => alias.model === model);

    if (!modelAliases.length) {
      throw new ForbiddenException(
        `Model "${model}" is not available on your plan (${tier}).`,
      );
    }

    const selected = modelAliases.find((alias) => alias.effort === effort);
    if (!selected) {
      throw new BadRequestException(
        `Effort "${effort}" is not supported for ${model}. Supported: ${modelAliases
          .map((alias) => alias.effort)
          .join(', ')}.`,
      );
    }

    return selected;
  }

  /**
   * Picks the alias for a turn.
   *
   * An out-of-tier request is refused outright: silently serving a cheaper
   * model would bill the user for one thing and give them another, and would
   * hide a misconfigured plan behind plausible output.
   */
  async resolveForUser(
    userId: string,
    requestedAlias?: string,
  ): Promise<ResolvedModelAlias> {
    const tier = await this.tierFor(userId);
    return this.resolveForTier(tier, requestedAlias);
  }

  /** Pick an allowed alias without looking up a candidate User document. */
  async resolveForTier(
    tier: string,
    requestedAlias?: string,
  ): Promise<ResolvedModelAlias> {
    const allowed = await this.listForTier(tier);

    if (!allowed.length) {
      throw new ForbiddenException(
        `No resume model is available on your plan (${tier}). ` +
          'Upgrade, or ask an administrator to enable an alias for this tier.',
      );
    }

    if (requestedAlias) {
      const match = allowed.find((a) => a.alias === requestedAlias);
      if (!match) {
        throw new ForbiddenException(
          `Model "${requestedAlias}" is not available on your plan (${tier}).`,
        );
      }
      return match;
    }

    const docs = await this.aliasModel
      .find({ isActive: true, tiers: tier })
      .sort({ rank: 1, alias: 1 })
      .lean()
      .exec();

    const preferred = this.offered(docs).find((d) =>
      (d.defaultForTiers || []).includes(tier),
    );

    return preferred ? this.toResolved(preferred, tier) : allowed[0];
  }

  private offered(docs: any[]): any[] {
    return docs.filter((d) => isOfferedHarnessAlias(d.alias, d.model));
  }

  private toResolved(doc: any, tier?: string): ResolvedModelAlias {
    return {
      alias: doc.alias,
      provider: doc.provider,
      model: doc.model,
      effort: doc.effort,
      label: doc.label,
      modelLabel: doc.modelLabel,
      maxOutputTokens: doc.maxOutputTokens,
      maxInputTokens: doc.maxInputTokens,
      tier,
    };
  }
}
