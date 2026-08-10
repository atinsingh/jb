import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobMatch, JobMatchDocument } from '../schemas/job-match.schema';
import { Job, JobDocument } from '../schemas/job.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { MatchCalculatorService } from '../llm/features/match-calculator.service';
import { CoverLetterGeneratorService } from '../llm/features/cover-letter-generator.service';
import { JobProfilesService } from '../job-profiles/job-profiles.service';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectModel(JobMatch.name) private jobMatchModel: Model<JobMatchDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private matchCalculatorService: MatchCalculatorService,
    private coverLetterGeneratorService: CoverLetterGeneratorService,
    private jobProfilesService: JobProfilesService,
  ) {}

  async calculateMatch(
    userId: string,
    jobId: string,
    profileId?: string,
  ): Promise<JobMatchDocument> {
    const user = await this.userModel.findById(userId);
    const job = await this.jobModel.findById(jobId);

    if (!user) {
      throw new Error('User not found');
    }
    if (!job) {
      throw new Error('Job not found');
    }

    // Get job profile (use specified profile or first active profile)
    let profile;
    if (profileId) {
      profile = await this.jobProfilesService.getProfile(profileId, userId);
    } else {
      const activeProfiles = await this.jobProfilesService.getActiveProfiles(userId);
      if (activeProfiles.length === 0) {
        throw new BadRequestException(
          'No active job profile found. Please create and activate a job profile first.',
        );
      }
      profile = activeProfiles[0]; // Use first active profile
    }

    try {
      const candidateSkills = profile.skills || [];
      const jobRequirements = job.requirements?.join(', ') || 'Not specified';
      const jobDescription = job.description || '';

      const matchResult = await this.matchCalculatorService.calculateMatch(
        userId,
        candidateSkills,
        jobRequirements,
        jobDescription,
      );

      const matchData = {
        userId: user._id,
        jobId: job._id,
        profileId: profile._id,
        matchScore: matchResult.matchScore || 0,
        matchedSkills: matchResult.matchedSkills || [],
        missingSkills: matchResult.missingSkills || [],
        reasoning: matchResult.reasoning || 'Match calculated by AI',
      };

      // Upsert match result
      const match = await this.jobMatchModel.findOneAndUpdate(
        { userId: user._id, jobId: job._id, profileId: profile._id },
        matchData,
        { new: true, upsert: true },
      );

      this.logger.log(
        `✅ Match calculated: ${match.matchScore}% for user ${user.email} - job ${job.title} - profile ${profile.profileName}`,
      );
      return match;
    } catch (error: any) {
      this.logger.error('Match calculation error:', error.message);
      this.logger.warn('Falling back to simple matching');
      // Fallback to simple matching
      return this.simpleMatch(user, job, profile);
    }
  }

  private async simpleMatch(
    user: UserDocument,
    job: JobDocument,
    profile: any,
  ): Promise<JobMatchDocument> {
    const candidateSkills = new Set((profile.skills || []).map((s: string) => s.toLowerCase()));
    const jobSkills = new Set((job.skills || []).map((s: string) => s.toLowerCase()));

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of jobSkills) {
      if (candidateSkills.has(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    const matchScore =
      jobSkills.size > 0 ? Math.round((matchedSkills.length / jobSkills.size) * 100) : 50;

    const matchData = {
      userId: user._id,
      jobId: job._id,
      profileId: profile._id,
      matchScore,
      matchedSkills,
      missingSkills,
      reasoning: `Simple skill matching: ${matchedSkills.length}/${jobSkills.size} skills matched`,
    };

    const match = await this.jobMatchModel.findOneAndUpdate(
      { userId: user._id, jobId: job._id, profileId: profile._id },
      matchData,
      { new: true, upsert: true },
    );

    return match;
  }

  async getMatches(userId: string, minScore?: number): Promise<JobMatchDocument[]> {
    const query: any = { userId };
    if (minScore !== undefined) {
      query.matchScore = { $gte: minScore };
    }

    return this.jobMatchModel
      .find(query)
      .populate('jobId')
      .sort({ matchScore: -1 })
      .exec();
  }

  async getRecommendations(userId: string, minScore: number = 60): Promise<JobMatchDocument[]> {
    return this.getMatches(userId, minScore);
  }

  async generateCoverLetter(
    userId: string,
    jobId: string,
    profileId?: string,
  ): Promise<string> {
    const user = await this.userModel.findById(userId);
    const job = await this.jobModel.findById(jobId);

    if (!user) {
      throw new Error('User not found');
    }
    if (!job) {
      throw new Error('Job not found');
    }

    // Get job profile (use specified profile or first active profile)
    let profile;
    if (profileId) {
      profile = await this.jobProfilesService.getProfile(profileId, userId);
    } else {
      const activeProfiles = await this.jobProfilesService.getActiveProfiles(userId);
      if (activeProfiles.length === 0) {
        throw new BadRequestException(
          'No active job profile found. Please create and activate a job profile first.',
        );
      }
      profile = activeProfiles[0]; // Use first active profile
    }

    try {
      const experienceText = profile.experience
        ?.map((exp: any) => `${exp.title} at ${exp.company} - ${exp.description || ''}`)
        .join('\n') || '';

      const candidateInfo = {
        name: user.name || 'Candidate',
        email: user.email || '',
        skills: profile.skills || [],
        experience: experienceText,
        summary: profile.summary || '',
      };

      const jobInfo = {
        title: job.title,
        companyName: job.companyName,
        description: job.description || '',
        requirements: job.requirements || [],
      };

      // The modern generator returns structured sections + a finalLetter; the
      // callers here expect the plain string letter, so map back to finalLetter.
      const result = await this.coverLetterGeneratorService.generateCoverLetter(
        userId,
        candidateInfo,
        jobInfo,
      );
      const coverLetter = result.finalLetter;
      this.logger.log(
        `✅ Cover letter generated for user ${user.email} - job ${job.title} - profile ${profile.profileName}`,
      );
      return coverLetter;
    } catch (error: any) {
      this.logger.error('Cover letter generation error:', error.message);
      throw new Error('Failed to generate cover letter');
    }
  }

  async batchMatch(userId: string, jobIds: string[]): Promise<JobMatchDocument[]> {
    const matches: JobMatchDocument[] = [];
    for (const jobId of jobIds) {
      try {
        const match = await this.calculateMatch(userId, jobId);
        matches.push(match);
      } catch (error) {
        console.error(`Error matching job ${jobId}:`, error);
      }
    }
    return matches;
  }

  async markInterested(userId: string, jobId: string, isInterested: boolean): Promise<JobMatchDocument> {
    return this.jobMatchModel.findOneAndUpdate(
      { userId, jobId },
      { isInterested, interestStatus: isInterested ? 'interested' : 'not_interested' },
      { new: true, upsert: true },
    );
  }

  async expressInterest(
    userId: string,
    matchIds: string[],
    interestStatus: string,
  ): Promise<{ updated: number; matches: JobMatchDocument[] }> {
    this.logger.debug(
      `expressInterest() called: userId=${userId}, matchIds=${matchIds.length}, status=${interestStatus}`,
    );

    const result = await this.jobMatchModel.updateMany(
      {
        _id: { $in: matchIds },
        userId,
      },
      {
        $set: {
          interestStatus,
          isInterested: interestStatus === 'interested',
        },
      },
    );

    const matches = await this.jobMatchModel
      .find({
        _id: { $in: matchIds },
        userId,
      })
      .exec();

    this.logger.log(`Updated ${result.modifiedCount} matches with interest status: ${interestStatus}`);

    return {
      updated: result.modifiedCount,
      matches,
    };
  }
}

