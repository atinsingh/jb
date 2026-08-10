import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../common/services/email.service';
import { AppLoggerService } from '../common/logger/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
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

  async updateEmail(
    userId: string,
    updateEmailDto: UpdateEmailDto,
  ): Promise<UserDocument> {
    this.logger.debug(`updateEmail() called with params: { userId: ${userId}, newEmail: ${updateEmailDto.newEmail} }`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`updateEmail() failed - User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!user.password || !(await bcrypt.compare(updateEmailDto.password, user.password))) {
      this.logger.warn(`updateEmail() failed - Invalid password for user: ${user.email} (ID: ${userId})`);
      throw new UnauthorizedException('Invalid password');
    }

    // Check if new email is already in use
    const existingUser = await this.userModel.findOne({ email: updateEmailDto.newEmail });
    if (existingUser && existingUser._id.toString() !== userId) {
      this.logger.warn(`updateEmail() failed - Email already in use: ${updateEmailDto.newEmail}`);
      throw new ConflictException('Email already in use');
    }

    const oldEmail = user.email;

    // Update email
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            email: updateEmailDto.newEmail,
            emailVerified: false, // Require re-verification
          },
        },
        { new: true },
      )
      .select('-password');

    // Send notification to old email
    try {
      await this.emailService.sendEmailChangeNotification(oldEmail, updateEmailDto.newEmail);
    } catch (error) {
      this.logger.warn(`Failed to send email change notification: ${error}`);
    }

    this.logger.log(`Email updated for user: ${oldEmail} -> ${updateEmailDto.newEmail} (ID: ${userId})`);
    this.logger.debug(`updateEmail() completed successfully`);
    return updatedUser!;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    this.logger.debug(`changePassword() called with params: { userId: ${userId} }`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.error(`changePassword() failed - User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!user.password || !(await bcrypt.compare(changePasswordDto.currentPassword, user.password))) {
      this.logger.warn(`changePassword() failed - Invalid current password for user: ${user.email} (ID: ${userId})`);
      throw new UnauthorizedException('Invalid current password');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    // Update password
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { password: hashedPassword },
    });

    this.logger.log(`Password changed successfully for user: ${user.email} (ID: ${userId})`);
    this.logger.debug(`changePassword() completed successfully`);
  }

  async requestPasswordReset(
    resetPasswordRequestDto: ResetPasswordRequestDto,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: resetPasswordRequestDto.email });
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${resetPasswordRequestDto.email}`);
      // Still return success to prevent email enumeration
      return { message: 'If the email exists, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token
    await this.userModel.findByIdAndUpdate(user._id, {
      $set: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry,
      },
    });

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(`✅ Password reset email sent to: ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error}`);
      // Clear the token if email failed
      await this.userModel.findByIdAndUpdate(user._id, {
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpires: 1,
        },
      });
      throw new BadRequestException('Failed to send password reset email');
    }

    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({
      resetPasswordToken: resetPasswordDto.token,
      resetPasswordExpires: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, saltRounds);

    // Update password and clear reset token
    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword },
      $unset: {
        resetPasswordToken: 1,
        resetPasswordExpires: 1,
      },
    });

    this.logger.log(`✅ Password reset completed for user: ${user.email}`);
    return { message: 'Password has been reset successfully' };
  }

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

