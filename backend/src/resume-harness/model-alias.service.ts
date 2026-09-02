import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  HarnessModelAlias,
  HarnessModelAliasDocument,
} from './schemas/harness-model-alias.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { ResolvedModelAlias } from './harness/harness.types';

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
    const docs = await this.aliasModel
      .find({ isActive: true, tiers: tier })
      .sort({ rank: 1, alias: 1 })
      .lean()
      .exec();

    return (docs as any[]).map((d) => this.toResolved(d, tier));
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
    const allowed = await this.listForUser(userId);

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

    const preferred = (docs as any[]).find((d) =>
      (d.defaultForTiers || []).includes(tier),
    );

    return preferred ? this.toResolved(preferred, tier) : allowed[0];
  }

  private toResolved(doc: any, tier?: string): ResolvedModelAlias {
    return {
      alias: doc.alias,
      provider: doc.provider,
      model: doc.model,
      effort: doc.effort,
      label: doc.label,
      maxOutputTokens: doc.maxOutputTokens,
      maxInputTokens: doc.maxInputTokens,
      tier,
    };
  }
}
