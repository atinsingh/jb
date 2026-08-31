import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../schemas/user.schema';
import { AppLoggerService } from '../common/logger/logger.service';

/**
 * Keeps the Mongo `User` collection in step with Supabase Auth.
 *
 * Supabase owns identity. This document owns everything else about a user:
 * `role`, plan, Stripe subscription state, and the relationships every other
 * collection points at. The database is not moving, so the two stores have to
 * stay consistent, and this is the only place that reconciles them.
 *
 * Two channels feed it, deliberately:
 *
 *  1. **Lazy upsert** (`resolveFromToken`) — runs in the auth guard on the first
 *     authenticated request. It has no delivery-failure mode and it covers the
 *     race where a user's first API call beats the webhook. It is the floor.
 *  2. **Database Webhook** (`handleWebhook`) — the only channel that can learn
 *     about updates and deletions made in Supabase, which a token-driven path
 *     structurally cannot see.
 *
 * Every operation here is idempotent, because webhook delivery is at-least-once
 * and can arrive out of order.
 */

/** The payload shape a Supabase Database Webhook posts for a table change. */
export interface SupabaseWebhookEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
}

@Injectable()
export class SupabaseUserSyncService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('SupabaseUserSyncService');
  }

  /**
   * Resolve a verified access token to a local user, creating one if this is
   * the first time we have seen this Supabase identity.
   */
  async resolveFromToken(
    supabaseUserId: string,
    claims: Record<string, any>,
  ): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ supabaseUserId });
    if (existing) return existing;

    const email = (claims.email as string | undefined)?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Token has no email to resolve a user by');
    }

    return this.claimOrCreate(supabaseUserId, email, claims.user_metadata || {}, {
      emailVerified: Boolean(claims.email_verified ?? claims.user_metadata?.email_verified),
      provider: this.providerFrom(claims.app_metadata?.provider),
    });
  }

  /**
   * Apply one `auth.users` change.
   *
   * Returns a short outcome string purely so the controller can log something
   * useful; Supabase does not act on the response body.
   */
  async handleWebhook(event: SupabaseWebhookEvent): Promise<string> {
    if (event.schema !== 'auth' || event.table !== 'users') {
      // Configured on the wrong table. Say so rather than failing silently.
      this.logger.warn(
        `Ignoring webhook for ${event.schema}.${event.table}; expected auth.users`,
      );
      return 'ignored';
    }

    switch (event.type) {
      case 'INSERT':
      case 'UPDATE':
        return this.upsertFromRecord(event.record);
      case 'DELETE':
        return this.deactivateFromRecord(event.old_record);
      default:
        this.logger.warn(`Unknown webhook event type: ${String(event.type)}`);
        return 'ignored';
    }
  }

  private async upsertFromRecord(record: Record<string, any> | null): Promise<string> {
    const supabaseUserId = record?.id as string | undefined;
    const email = (record?.email as string | undefined)?.toLowerCase();

    if (!supabaseUserId || !email) {
      this.logger.warn('Webhook record missing id or email; nothing to sync');
      return 'ignored';
    }

    const metadata = (record.raw_user_meta_data || record.user_metadata || {}) as Record<
      string,
      any
    >;
    const emailVerified = Boolean(record.email_confirmed_at);

    const existing = await this.userModel.findOne({ supabaseUserId });
    if (existing) {
      // Only ever touch the fields Supabase owns. `role`, plan and Stripe state
      // live here, not there, and must survive every sync.
      existing.email = email;
      existing.emailVerified = emailVerified;
      if (metadata.name || metadata.full_name) {
        existing.name = metadata.name || metadata.full_name;
      }
      // A user restored in Supabase after a delete should come back.
      if (record.deleted_at == null && existing.isActive === false) {
        existing.isActive = true;
      }
      await existing.save();
      return 'updated';
    }

    // An UPDATE for a user we have never seen is not an error: it is an
    // out-of-order delivery, or the INSERT was lost. Creating here self-heals.
    await this.claimOrCreate(supabaseUserId, email, metadata, {
      emailVerified,
      provider: this.providerFrom(
        record.raw_app_meta_data?.provider ?? record.app_metadata?.provider,
      ),
    });
    return 'created';
  }

  private async deactivateFromRecord(
    record: Record<string, any> | null,
  ): Promise<string> {
    const supabaseUserId = record?.id as string | undefined;
    if (!supabaseUserId) {
      this.logger.warn('Webhook delete carried no record id');
      return 'ignored';
    }

    /*
     * Soft-deactivate, never hard-delete.
     *
     * Applications, resumes, job matches and Stripe records all reference this
     * document. Removing it would orphan every one of them, and a deletion that
     * arrives out of order or by mistake would be unrecoverable. Flipping
     * `isActive` is enough: the auth guard already rejects a token for an
     * inactive account on the next request.
     */
    const result = await this.userModel.updateOne(
      { supabaseUserId },
      { $set: { isActive: false } },
    );

    if (result.matchedCount === 0) {
      // A DELETE for a user we never created. Nothing to do, and creating one
      // would be absurd. Idempotent by omission.
      this.logger.warn(`Delete webhook for unknown Supabase user ${supabaseUserId}`);
      return 'ignored';
    }

    this.logger.log(`Deactivated local user for Supabase ${supabaseUserId}`);
    return 'deactivated';
  }

  /**
   * Find-or-create, with the email-claim rule that makes the migration work.
   *
   * A migrated account already exists locally under its email but has not been
   * stamped with a Supabase id yet. Claiming it preserves role, plan and Stripe
   * state; creating a second row would silently downgrade a paying user.
   */
  private async claimOrCreate(
    supabaseUserId: string,
    email: string,
    metadata: Record<string, any>,
    extra: { emailVerified: boolean; provider: string },
  ): Promise<UserDocument> {
    const byEmail = await this.userModel.findOne({ email });
    if (byEmail) {
      byEmail.supabaseUserId = supabaseUserId;
      if (!byEmail.name && (metadata.name || metadata.full_name)) {
        byEmail.name = metadata.name || metadata.full_name;
      }
      await byEmail.save();
      this.logger.log(`Linked existing user ${email} to Supabase ${supabaseUserId}`);
      return byEmail;
    }

    const created = await this.userModel.create({
      supabaseUserId,
      email,
      name: metadata.name || metadata.full_name,
      picture: metadata.avatar_url || metadata.picture,
      provider: extra.provider,
      role: this.signupRoleFrom(metadata),
      emailVerified: extra.emailVerified,
      isActive: true,
      lastLogin: new Date(),
    });

    this.logger.log(`Created local user for Supabase ${supabaseUserId} (${email})`);
    return created;
  }

  /**
   * The role a brand-new account starts with.
   *
   * `user_metadata` is USER-WRITABLE, so this is only ever consulted when
   * creating a user, never to re-evaluate an existing one, and only these two
   * values are honoured. That is exactly the guarantee the old RegisterDto gave
   * (`@IsIn(['ROLE_CANDIDATE', 'ROLE_EMPLOYER'])`): a visitor may declare
   * themselves a job seeker or an employer at sign-up, and nothing else.
   * ROLE_AGENT and ROLE_ADMIN are assigned by an admin, never self-selected.
   */
  private signupRoleFrom(metadata: Record<string, any>): string {
    return metadata?.role === 'ROLE_EMPLOYER' ? 'ROLE_EMPLOYER' : 'ROLE_CANDIDATE';
  }

  private providerFrom(provider: unknown): string {
    if (provider === 'google') return 'google';
    if (provider === 'linkedin_oidc' || provider === 'linkedin') return 'linkedin';
    return 'local';
  }
}
