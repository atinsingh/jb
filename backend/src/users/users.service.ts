import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AppLoggerService } from '../common/logger/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('UsersService');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('-password');
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('-password');
  }

  /**
   * Fields the browser extension autofills into external ATS forms. Returns
   * ONLY information the candidate has already provided — never fabricated, and
   * the extension fills, then pauses for the candidate to review and submit.
   */
  async getAutofillPayload(userId: string) {
    const user = await this.findById(userId);
    if (!user) return null;
    const name = (user.name || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    // linkedin/github are optional profile links; read defensively so the
    // payload stays forward-compatible if/when they are added to the schema.
    const u = user as any;
    return {
      fullName: name || undefined,
      firstName,
      lastName,
      email: user.email,
      phone: user.phone || undefined,
      location: user.location || undefined,
      linkedin: u.linkedin || u.linkedinUrl || undefined,
      github: u.github || u.githubUrl || undefined,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserDocument> {
    // Log which fields are being updated, not their values — the payload holds
    // PII (name, location, headline, links).
    this.logger.debug(`updateProfile() called for user ${userId}, fields: [${Object.keys(updateProfileDto || {}).join(', ')}]`);

    const allowedFields = [
      'name',
      'phone',
      'location',
      'headline',
      'linkedin',
      'summary',
      'skills',
      'experience',
      'education',
      'preferredLocations',
      'preferredJobTypes',
      'autoApply',
      'minMatchScore',
    ];

    const filteredUpdates: any = {};
    allowedFields.forEach((field) => {
      if (updateProfileDto[field] !== undefined) {
        filteredUpdates[field] = updateProfileDto[field];
      }
    });

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: filteredUpdates },
        { new: true, runValidators: true },
      )
      .select('-password');

    if (!updatedUser) {
      this.logger.error(`updateProfile() failed - User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    this.logger.log(`Profile updated for user: ${updatedUser.email} (ID: ${userId})`);
    this.logger.debug(`updateProfile() completed successfully`);
    return updatedUser;
  }

  async updateProfilePicture(
    userId: string,
    pictureUrl: string,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { picture: pictureUrl } },
        { new: true },
      )
      .select('-password');

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`✅ Profile picture updated for user: ${updatedUser.email}`);
    return updatedUser;
  }

  /*
   * updateEmail, changePassword, requestPasswordReset and resetPassword lived
   * here. Supabase Auth owns credentials now, so keeping them would have meant
   * two diverging ways to change the same secret - and the hand-rolled reset
   * token they used (crypto.randomBytes into resetPasswordToken) is precisely
   * what Supabase replaces with a properly rotated one.
   */

  async getProfile(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // ---------------------------------------------------------------------------
  // Admin console (ROLE_ADMIN only — guarded at the controller layer)
  // ---------------------------------------------------------------------------

  private static readonly ADMIN_ROLES: UserRole[] = [
    'ROLE_CANDIDATE',
    'ROLE_EMPLOYER',
    'ROLE_AGENT',
    'ROLE_ADMIN',
  ];

  /**
   * Paginated, filterable user list for the admin console. `q` matches email OR
   * name case-insensitively. Newest first.
   */
  async adminList(params: {
    role?: string;
    q?: string;
    plan?: string;
    isActive?: boolean | string;
    page?: number | string;
    limit?: number | string;
  }): Promise<{ users: UserDocument[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(String(params.page ?? 1), 10) || 1);
    const limit = Math.max(1, parseInt(String(params.limit ?? 20), 10) || 20);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (params.role) filter.role = params.role;
    if (params.plan) filter.currentPlanType = params.plan;
    if (params.isActive !== undefined && params.isActive !== '') {
      filter.isActive = params.isActive === true || params.isActive === 'true';
    }
    if (params.q) {
      const rx = new RegExp(this.escapeRegex(params.q), 'i');
      filter.$or = [{ email: rx }, { name: rx }];
    }

    const users = await this.userModel
      .find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.userModel.countDocuments(filter);
    return { users, total, page, limit };
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Change a user's role. Validates against the 4 known role enum values. */
  async adminSetRole(id: string, role: string): Promise<UserDocument> {
    if (!UsersService.ADMIN_ROLES.includes(role as UserRole)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, { $set: { role } }, { new: true, runValidators: true })
      .select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.logger.log(`Admin set role=${role} for user ${id}`);
    return user;
  }

  /** Suspend a user account (also disables login via isActive:false). */
  async adminSuspend(id: string, reason?: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            suspended: true,
            isActive: false,
            suspendedReason: reason ?? '',
            suspendedAt: new Date(),
          },
        },
        { new: true },
      )
      .select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.logger.log(`Admin suspended user ${id}${reason ? ` (${reason})` : ''}`);
    return user;
  }

  /** Reactivate a previously suspended account. */
  async adminReactivate(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: { suspended: false, isActive: true },
          $unset: { suspendedReason: 1, suspendedAt: 1 },
        },
        { new: true },
      )
      .select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    this.logger.log(`Admin reactivated user ${id}`);
    return user;
  }
}

