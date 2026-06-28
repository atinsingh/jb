import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobProfile, JobProfileDocument } from '../schemas/job-profile.schema';
import { CreateJobProfileDto } from './dto/create-job-profile.dto';
import { UpdateJobProfileDto } from './dto/update-job-profile.dto';
import { AppLoggerService } from '../common/logger/logger.service';

@Injectable()
export class JobProfilesService {
  constructor(
    @InjectModel(JobProfile.name)
    private jobProfileModel: Model<JobProfileDocument>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('JobProfilesService');
  }

  async createProfile(
    userId: string,
    createDto: CreateJobProfileDto,
  ): Promise<JobProfileDocument> {
    this.logger.debug(
      `createProfile() called with params: { userId: ${userId}, profileName: ${createDto.profileName} }`,
    );

    const profile = await this.jobProfileModel.create({
      userId,
      ...createDto,
      active: false, // New profiles are inactive by default
      complete: false,
    });

    this.logger.log(
      `Job profile created: ${profile.profileName} (ID: ${profile._id}) for user: ${userId}`,
    );

    return profile;
  }

  async updateProfile(
    profileId: string,
    userId: string,
    updateDto: UpdateJobProfileDto,
  ): Promise<JobProfileDocument> {
    this.logger.debug(
      `updateProfile() called with params: { profileId: ${profileId}, userId: ${userId} }`,
    );

    const profile = await this.jobProfileModel.findOne({
      _id: profileId,
      userId,
    });

    if (!profile) {
      this.logger.error(`Profile not found: ${profileId} for user: ${userId}`);
      throw new NotFoundException('Job profile not found');
    }

    const updatedProfile = await this.jobProfileModel.findByIdAndUpdate(
      profileId,
      { $set: updateDto },
      { new: true, runValidators: true },
    );

    this.logger.log(`Job profile updated: ${profileId}`);
    return updatedProfile!;
  }

  async activateProfile(
    profileId: string,
    userId: string,
    active: boolean,
  ): Promise<JobProfileDocument> {
    this.logger.debug(
      `activateProfile() called with params: { profileId: ${profileId}, userId: ${userId}, active: ${active} }`,
    );

    const profile = await this.jobProfileModel.findOne({
      _id: profileId,
      userId,
    });

    if (!profile) {
      this.logger.error(`Profile not found: ${profileId} for user: ${userId}`);
      throw new NotFoundException('Job profile not found');
    }

    // If activating, check if user already has 2 active profiles
    if (active) {
      const activeProfiles = await this.jobProfileModel.countDocuments({
        userId,
        active: true,
        _id: { $ne: profileId }, // Exclude current profile
      });

      if (activeProfiles >= 2) {
        this.logger.warn(
          `Cannot activate profile - User already has 2 active profiles: ${userId}`,
        );
        throw new BadRequestException(
          'Maximum 2 active profiles allowed. Please deactivate another profile first.',
        );
      }
    }

    const updatedProfile = await this.jobProfileModel.findByIdAndUpdate(
      profileId,
      { $set: { active } },
      { new: true },
    );

    this.logger.log(
      `Job profile ${active ? 'activated' : 'deactivated'}: ${profileId}`,
    );

    return updatedProfile!;
  }

  async getUserProfiles(userId: string): Promise<JobProfileDocument[]> {
    this.logger.debug(`getUserProfiles() called for user: ${userId}`);

    const profiles = await this.jobProfileModel
      .find({ userId })
      .sort({ createdAt: -1 });

    this.logger.debug(`Found ${profiles.length} profiles for user: ${userId}`);
    return profiles;
  }

  async getProfile(
    profileId: string,
    userId: string,
  ): Promise<JobProfileDocument> {
    this.logger.debug(
      `getProfile() called with params: { profileId: ${profileId}, userId: ${userId} }`,
    );

    const profile = await this.jobProfileModel.findOne({
      _id: profileId,
      userId,
    });

    if (!profile) {
      this.logger.error(`Profile not found: ${profileId} for user: ${userId}`);
      throw new NotFoundException('Job profile not found');
    }

    return profile;
  }

  async getActiveProfiles(userId: string): Promise<JobProfileDocument[]> {
    this.logger.debug(`getActiveProfiles() called for user: ${userId}`);

    const profiles = await this.jobProfileModel
      .find({ userId, active: true })
      .sort({ createdAt: -1 });

    return profiles;
  }

  async deleteProfile(profileId: string, userId: string): Promise<void> {
    this.logger.debug(
      `deleteProfile() called with params: { profileId: ${profileId}, userId: ${userId} }`,
    );

    const profile = await this.jobProfileModel.findOne({
      _id: profileId,
      userId,
    });

    if (!profile) {
      this.logger.error(`Profile not found: ${profileId} for user: ${userId}`);
      throw new NotFoundException('Job profile not found');
    }

    await this.jobProfileModel.findByIdAndDelete(profileId);
    this.logger.log(`Job profile deleted: ${profileId}`);
  }

  async updateProfileFromResume(
    profileId: string,
    userId: string,
    resumeData: {
      skills?: string[];
      experience?: Array<{
        title?: string;
        company?: string;
        duration?: string;
        description?: string;
      }>;
      education?: Array<{
        degree?: string;
        institution?: string;
        year?: string;
      }>;
      resumePath?: string;
      resumeText?: string;
    },
  ): Promise<JobProfileDocument> {
    this.logger.debug(
      `updateProfileFromResume() called for profile: ${profileId}`,
    );

    const profile = await this.jobProfileModel.findOne({
      _id: profileId,
      userId,
    });

    if (!profile) {
      throw new NotFoundException('Job profile not found');
    }

    // Update profile with resume data
    const updates: any = {
      skills: resumeData.skills || profile.skills,
      experience: resumeData.experience || profile.experience,
      education: resumeData.education || profile.education,
      resumePath: resumeData.resumePath || profile.resumePath,
      resumeText: resumeData.resumeText || profile.resumeText,
    };

    // Mark as complete if all required data is present
    const hasSkills = updates.skills && updates.skills.length > 0;
    const hasExperience = updates.experience && updates.experience.length > 0;
    const hasEducation = updates.education && updates.education.length > 0;
    const hasResume = !!updates.resumePath;

    updates.complete = hasSkills && hasExperience && hasEducation && hasResume;

    const updatedProfile = await this.jobProfileModel.findByIdAndUpdate(
      profileId,
      { $set: updates },
      { new: true },
    );

    this.logger.log(
      `Profile updated from resume: ${profileId}, complete: ${updates.complete}`,
    );

    return updatedProfile!;
  }

  async getProfileStats(userId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    complete: number;
  }> {
    const [total, active, inactive, complete] = await Promise.all([
      this.jobProfileModel.countDocuments({ userId }),
      this.jobProfileModel.countDocuments({ userId, active: true }),
      this.jobProfileModel.countDocuments({ userId, active: false }),
      this.jobProfileModel.countDocuments({ userId, complete: true }),
    ]);

    return { total, active, inactive, complete };
  }
}

