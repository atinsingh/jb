import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { JobMatch, JobMatchDocument } from '../schemas/job-match.schema';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { PackageType, AgentType, PACKAGE_CONFIG } from '../schemas/package.schema';
import { AppLoggerService } from '../common/logger/logger.service';

@Injectable()
export class AgentAssignmentService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobMatch.name) private jobMatchModel: Model<JobMatchDocument>,
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext('AgentAssignmentService');
  }

  /**
   * Get agent type based on user's package
   */
  getAgentTypeForPackage(packageType: string): AgentType {
    const config = PACKAGE_CONFIG[packageType as PackageType];
    return config?.agentType || AgentType.AI;
  }

  /**
   * Assign agent to job matches based on interest status
   */
  async assignAgentToMatches(
    userId: string,
    matchIds: string[],
  ): Promise<{ assigned: number; agentType: string }> {
    this.logger.debug(
      `assignAgentToMatches() called: userId=${userId}, matchIds=${matchIds.length}`,
    );

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const packageType = user.package || 'free';
    const agentType = this.getAgentTypeForPackage(packageType);

    // For AI agent, we don't need to assign a specific user
    // For human agent, assign to an available agent
    let assignedAgentId: string | null = null;

    if (agentType === AgentType.HUMAN) {
      // Find an available human agent (least assigned candidates)
      const agent = await this.userModel
        .findOne({
          role: 'ROLE_AGENT',
          isActive: true,
        })
        .sort({ assignedCandidatesCount: 1 })
        .exec();

      if (agent) {
        assignedAgentId = agent._id.toString();
        // Increment assigned count
        await this.userModel.findByIdAndUpdate(assignedAgentId, {
          $inc: { assignedCandidatesCount: 1 },
        });
      } else {
        this.logger.warn('No available human agent found, falling back to AI');
        // Fallback to AI if no human agent available
      }
    }

    // Update job matches with agent assignment
    const updateData: any = {
      agentType: agentType === AgentType.HUMAN && assignedAgentId ? 'human' : 'ai',
      assignedAt: new Date(),
    };

    if (assignedAgentId) {
      updateData.assignedAgentId = assignedAgentId;
    }

    const result = await this.jobMatchModel.updateMany(
      {
        _id: { $in: matchIds },
        userId,
        interestStatus: 'interested',
      },
      { $set: updateData },
    );

    this.logger.log(
      `Assigned ${result.modifiedCount} matches to ${agentType} agent for user ${userId}`,
    );

    return {
      assigned: result.modifiedCount,
      agentType: agentType === AgentType.HUMAN && assignedAgentId ? 'human' : 'ai',
    };
  }

  /**
   * Get assigned candidates for an agent
   */
  async getAssignedCandidates(agentId: string): Promise<UserDocument[]> {
    this.logger.debug(`getAssignedCandidates() called for agent: ${agentId}`);

    // Find all users who have matches assigned to this agent
    const matches = await this.jobMatchModel
      .find({
        assignedAgentId: agentId,
        interestStatus: 'interested',
      })
      .populate('userId')
      .exec();

    // Get unique user IDs
    const userIds = [
      ...new Set(matches.map((match) => match.userId.toString())),
    ];

    const users = await this.userModel.find({
      _id: { $in: userIds },
    });

    return users;
  }

  /**
   * Get job matches assigned to an agent
   */
  async getAssignedMatches(agentId: string): Promise<JobMatchDocument[]> {
    this.logger.debug(`getAssignedMatches() called for agent: ${agentId}`);

    return this.jobMatchModel
      .find({
        assignedAgentId: agentId,
        interestStatus: 'interested',
      })
      .populate('userId')
      .populate('jobId')
      .populate('profileId')
      .sort({ assignedAt: -1 })
      .exec();
  }

  /**
   * Check if user can perform bulk operations based on package
   */
  async canPerformBulkOperation(
    userId: string,
    count: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const packageType = user.package || 'free';
    const config = PACKAGE_CONFIG[packageType as PackageType];

    if (!config) {
      return { allowed: false, reason: 'Invalid package' };
    }

    // Enterprise has unlimited (-1)
    if (config.maxBulkOperations === -1) {
      return { allowed: true };
    }

    // TODO: Check monthly usage count
    // For now, we'll allow based on package limit
    if (count > config.maxBulkOperations) {
      return {
        allowed: false,
        reason: `Package limit exceeded. Max ${config.maxBulkOperations} bulk operations allowed.`,
      };
    }

    return { allowed: true };
  }
}

