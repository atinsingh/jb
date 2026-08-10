import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { JobMatch, JobMatchDocument } from '../schemas/job-match.schema';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { JobProfile, JobProfileDocument } from '../schemas/job-profile.schema';
import { ApplicationsService } from '../applications/applications.service';
import { MatchingService } from '../matching/matching.service';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { AppLoggerService } from '../common/logger/logger.service';
import { StorageService } from '../storage';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobMatch.name) private jobMatchModel: Model<JobMatchDocument>,
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(JobProfile.name)
    private jobProfileModel: Model<JobProfileDocument>,
    private applicationsService: ApplicationsService,
    private matchingService: MatchingService,
    private readonly logger: AppLoggerService,
    private readonly storageService: StorageService,
  ) {
    this.logger.setContext('AgentsService');
  }

  async getCandidateProfile(
    candidateId: string,
    agentId: string,
  ): Promise<{
    user: UserDocument;
    profiles: JobProfileDocument[];
    matches: JobMatchDocument[];
    applications: ApplicationDocument[];
  }> {
    this.logger.debug(
      `getCandidateProfile() called: candidateId=${candidateId}, agentId=${agentId}`,
    );

    // Verify agent has access to this candidate
    const match = await this.jobMatchModel.findOne({
      userId: candidateId,
      assignedAgentId: agentId,
    });

    if (!match) {
      throw new ForbiddenException(
        'You do not have access to this candidate. They are not assigned to you.',
      );
    }

    const [user, profiles, matches, applications] = await Promise.all([
      this.userModel.findById(candidateId).select('-password'),
      this.jobProfileModel.find({ userId: candidateId }),
      this.jobMatchModel
        .find({ userId: candidateId, assignedAgentId: agentId })
        .populate('jobId')
        .populate('profileId'),
      this.applicationModel
        .find({ candidateId, agentId })
        .populate('jobId')
        .populate('profileId'),
    ]);

    if (!user) {
      throw new NotFoundException('Candidate not found');
    }

    return {
      user,
      profiles,
      matches,
      applications,
    };
  }

  async applyOnBehalf(
    matchId: string,
    agentId: string,
  ): Promise<ApplicationDocument> {
    this.logger.debug(`applyOnBehalf() called: matchId=${matchId}, agentId=${agentId}`);

    const match = await this.jobMatchModel
      .findById(matchId)
      .populate('jobId')
      .populate('profileId');

    if (!match) {
      throw new NotFoundException('Job match not found');
    }

    if (match.assignedAgentId?.toString() !== agentId) {
      throw new ForbiddenException(
        'You do not have access to this match. It is not assigned to you.',
      );
    }

    if (match.interestStatus !== 'interested') {
      throw new BadRequestException('Candidate must be interested in this job to apply');
    }

    // Check if application already exists
    const existing = await this.applicationModel.findOne({
      candidateId: match.userId,
      jobId: match.jobId,
    });

    if (existing) {
      throw new BadRequestException('Application already exists for this job');
    }

    // Generate cover letter if needed
    let coverLetter = '';
    try {
      coverLetter = await this.matchingService.generateCoverLetter(
        match.userId.toString(),
        match.jobId.toString(),
        match.profileId?.toString(),
      );
    } catch (error) {
      this.logger.warn('Failed to generate cover letter:', error);
    }

    // Create application
    const application = await this.applicationModel.create({
      candidateId: match.userId,
      jobId: match.jobId,
      profileId: match.profileId,
      agentId,
      appliedBy: match.agentType === 'human' ? 'human' : 'ai',
      matchScore: match.matchScore,
      coverLetter,
      status: 'submitted',
      submittedAt: new Date(),
    });

    // Update match
    await this.jobMatchModel.findByIdAndUpdate(matchId, {
      appliedAt: new Date(),
    });

    this.logger.log(
      `Application created by agent ${agentId} for candidate ${match.userId} - job ${match.jobId}`,
    );

    return application;
  }

  async updateApplication(
    applicationId: string,
    agentId: string,
    updateDto: UpdateApplicationDto,
  ): Promise<ApplicationDocument> {
    this.logger.debug(
      `updateApplication() called: applicationId=${applicationId}, agentId=${agentId}`,
    );

    const application = await this.applicationModel.findById(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.agentId?.toString() !== agentId) {
      throw new ForbiddenException(
        'You do not have access to this application. It is not assigned to you.',
      );
    }

    const updates: any = {};
    if (updateDto.status) updates.status = updateDto.status;
    if (updateDto.agentNotes) updates.agentNotes = updateDto.agentNotes;
    if (updateDto.notes) updates.notes = updateDto.notes;

    const updated = await this.applicationModel.findByIdAndUpdate(
      applicationId,
      { $set: updates },
      { new: true },
    );

    this.logger.log(`Application ${applicationId} updated by agent ${agentId}`);

    return updated!;
  }

  async uploadProof(
    applicationId: string,
    agentId: string,
    files: Express.Multer.File[],
  ): Promise<ApplicationDocument> {
    this.logger.debug(
      `uploadProof() called: applicationId=${applicationId}, agentId=${agentId}, files=${files.length}`,
    );

    const application = await this.applicationModel.findById(applicationId);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.agentId?.toString() !== agentId) {
      throw new ForbiddenException(
        'You do not have access to this application. It is not assigned to you.',
      );
    }

    // Save files via the storage abstraction and collect their served URLs.
    const proofUrls: string[] = [];
    for (const file of files) {
      const key = `proof/${applicationId}/${Date.now()}-${file.originalname}`;
      const { url } = await this.storageService.put(key, file.buffer);
      // For S3 the object is private, so hand back a signed URL; for local the
      // returned url is already publicly served at /uploads/.
      const proofUrl =
        this.storageService.getDriverName() === 's3'
          ? await this.storageService.getSignedUrl(key)
          : url;
      proofUrls.push(proofUrl);
    }

    // Update application with proof documents
    const existingProof = application.proofDocuments || [];
    const updated = await this.applicationModel.findByIdAndUpdate(
      applicationId,
      {
        $set: {
          proofDocuments: [...existingProof, ...proofUrls],
          proofSubmittedAt: new Date(),
        },
      },
      { new: true },
    );

    this.logger.log(
      `Proof documents uploaded for application ${applicationId} by agent ${agentId}`,
    );

    return updated!;
  }
}

