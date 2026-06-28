import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationArtifact, ApplicationArtifactDocument, ArtifactType } from '../schemas/application-artifact.schema';
import { LLMAuditLog, LLMAuditLogDocument } from '../schemas/llm-audit-log.schema';
import { PromptVersion, PromptVersionDocument } from '../schemas/prompt-version.schema';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';
import { LLMQuotaService } from '../llm/llm-quota.service';
import { User, UserDocument } from '../schemas/user.schema';
import { Job, JobDocument } from '../schemas/job.schema';

export interface AnswersPack {
  workAuthorization?: string;
  salaryExpectations?: string;
  noticePeriod?: string;
  whyUs?: string;
  availability?: string;
  relocation?: string;
  [key: string]: any; // Allow custom questions
}

@Injectable()
export class AssistedApplyService {
  private readonly logger = new Logger(AssistedApplyService.name);
  private readonly PROMPT_KEY = 'answers_pack_generation';

  constructor(
    @InjectModel(ApplicationArtifact.name)
    private artifactModel: Model<ApplicationArtifactDocument>,
    @InjectModel(LLMAuditLog.name)
    private auditLogModel: Model<LLMAuditLogDocument>,
    @InjectModel(PromptVersion.name)
    private promptVersionModel: Model<PromptVersionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    private readonly llmRoutingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
  ) {}

  /**
   * Generate answers pack for a job application
   */
  async generateAnswersPack(
    userId: string,
    jobId: string,
    applicationId: string,
    customQuestions?: string[],
  ): Promise<AnswersPack> {
    // Check quota
    await this.quotaService.enforceQuota(userId, LLMFeature.GENERATE_COVER_LETTER); // Reuse cover letter feature

    // Get user and job data
    const user = await this.userModel.findById(userId);
    const job = await this.jobModel.findById(jobId);

    if (!user || !job) {
      throw new Error('User or job not found');
    }

    // Get active prompt version
    const promptVersion = await this.getActivePromptVersion(this.PROMPT_KEY);
    if (!promptVersion) {
      throw new Error('No active prompt version found');
    }

    // Build prompt
    const prompt = this.buildPrompt(promptVersion.prompt, user, job, customQuestions);

    // Get LLM provider
    const provider = this.llmRoutingService.getProviderForFeature(
      LLMFeature.GENERATE_COVER_LETTER,
    );
    const config = this.llmRoutingService.getFeatureConfig(LLMFeature.GENERATE_COVER_LETTER);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are a job application assistant. Generate professional, honest answers to common application questions based on the candidate profile and job description. Return ONLY valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      // Parse response
      let answersPack: AnswersPack;
      try {
        answersPack = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch =
          response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          answersPack = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      // Save audit log
      await this.saveAuditLog(
        userId,
        this.PROMPT_KEY,
        promptVersion.version,
        prompt,
        provider.getName(),
        config.model,
        response.usage,
        JSON.stringify(answersPack),
      );

      // Save as artifact
      await this.saveArtifact(
        applicationId,
        userId,
        ArtifactType.ANSWERS_PACK,
        JSON.stringify(answersPack),
      );

      // Record usage
      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.GENERATE_COVER_LETTER,
        provider.getName(),
        config.model,
        response.usage,
        { jobId, applicationId },
      );

      return answersPack;
    } catch (error: any) {
      this.logger.error('Error generating answers pack:', error);
      throw error;
    }
  }

  /**
   * Get answers pack for an application
   */
  async getAnswersPack(
    applicationId: string,
    userId: string,
  ): Promise<AnswersPack | null> {
    const artifact = await this.artifactModel.findOne({
      applicationId,
      userId,
      type: ArtifactType.ANSWERS_PACK,
      isActive: true,
    });

    if (!artifact) {
      return null;
    }

    return JSON.parse(artifact.content);
  }

  /**
   * Update answers pack
   */
  async updateAnswersPack(
    applicationId: string,
    userId: string,
    answersPack: AnswersPack,
  ): Promise<ApplicationArtifactDocument> {
    // Deactivate existing
    await this.artifactModel.updateMany(
      {
        applicationId,
        userId,
        type: ArtifactType.ANSWERS_PACK,
        isActive: true,
      },
      { isActive: false },
    );

    // Create new version
    const artifact = new this.artifactModel({
      applicationId,
      userId,
      type: ArtifactType.ANSWERS_PACK,
      content: JSON.stringify(answersPack),
      isActive: true,
    });

    return artifact.save();
  }

  /**
   * Get active prompt version
   */
  private async getActivePromptVersion(promptKey: string): Promise<PromptVersionDocument | null> {
    return this.promptVersionModel.findOne({
      promptKey,
      isActive: true,
    });
  }

  /**
   * Build prompt for answers pack generation
   */
  private buildPrompt(
    template: string,
    user: UserDocument,
    job: JobDocument,
    customQuestions?: string[],
  ): string {
    let prompt = template
      .replace('{{userName}}', user.name || 'Candidate')
      .replace('{{userEmail}}', user.email)
      .replace('{{userSkills}}', (user.skills || []).join(', '))
      .replace('{{userSummary}}', user.summary || '')
      .replace('{{jobTitle}}', job.title)
      .replace('{{companyName}}', job.companyName)
      .replace('{{jobDescription}}', job.description || '')
      .replace('{{jobRequirements}}', (job.requirements || []).join(', '));

    if (customQuestions && customQuestions.length > 0) {
      prompt += `\n\nAdditional Questions to Answer:\n${customQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    }

    return prompt;
  }

  /**
   * Save audit log
   */
  private async saveAuditLog(
    userId: string,
    promptKey: string,
    promptVersion: string,
    prompt: string,
    provider: string,
    model: string,
    usage: { promptTokens: number; completionTokens: number; totalTokens: number; cost?: number },
    response: string,
  ): Promise<LLMAuditLogDocument> {
    const auditLog = new this.auditLogModel({
      userId,
      feature: 'answers_pack',
      promptKey,
      promptVersion,
      prompt,
      model,
      provider,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      cost: usage.cost || 0,
      response: response.substring(0, 10000), // Truncate large responses
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });

    return auditLog.save();
  }

  /**
   * Save artifact
   */
  private async saveArtifact(
    applicationId: string,
    userId: string,
    type: ArtifactType,
    content: string,
  ): Promise<ApplicationArtifactDocument> {
    // Deactivate existing artifacts of this type
    await this.artifactModel.updateMany(
      { applicationId, userId, type, isActive: true },
      { isActive: false },
    );

    const artifact = new this.artifactModel({
      applicationId,
      userId,
      type,
      content,
      isActive: true,
    });

    return artifact.save();
  }
}

