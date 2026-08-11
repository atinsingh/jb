import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLMRoutingService, LLMFeature } from '../llm-routing.service';
import { LLMQuotaService } from '../llm-quota.service';
import { z } from 'zod';

/**
 * Defined locally rather than in @jobocate/contracts (where its sibling LLM
 * schemas live): the contracts package's dts bundler was, for reasons not
 * worth the build-tooling archaeology to chase down mid-feature, silently
 * dropping this specific export from its generated .d.ts on every rebuild —
 * reproducible under multiple names and file positions, while every existing
 * sibling schema built fine. Zod is a direct dependency here already, so this
 * costs nothing; if it turns out to be needed by another package later, move
 * it then with the bundler issue as a solved, isolated problem to debug.
 */
export const JobDescriptionResponseSchema = z.object({
  description: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(z.string()),
  benefits: z.array(z.string()),
  confidence: z.number().min(0).max(1).optional(),
});

export type JobDescriptionResponse = z.infer<
  typeof JobDescriptionResponseSchema
>;

export interface JobDescriptionSeed {
  title: string;
  companyName?: string;
  location?: string;
  isRemote?: boolean;
  jobType?: string;
  experience?: string;
  educationLevel?: string;
  skills?: string[];
  /** Free-text notes the employer wants emphasized — a stack, a team detail. */
  notes?: string;
}

/**
 * Drafts a job posting's description, responsibilities, requirements and
 * benefits from what the employer has already typed into the post-a-job form.
 *
 * Deliberately different from CoverLetterGeneratorService in one respect: no
 * claims-review pass. That guard exists to catch a model inventing facts
 * ABOUT A PERSON (a metric they never achieved, a team size they never led) —
 * grounding that matters because a résumé represents a real candidate's
 * history. A job posting is prose the employer is drafting from scratch for a
 * role that doesn't exist yet; there is no prior fact for the model to
 * misrepresent. The employer reviews and edits every generated field before
 * Preview & Submit, which is the actual check here.
 */
@Injectable()
export class JobDescriptionGeneratorService {
  private readonly logger = new Logger(JobDescriptionGeneratorService.name);

  // Matches the sibling feature-services: quota is opt-in via LLM_ENFORCE_QUOTA
  // until per-feature costs are tuned, so this cannot lock an employer out
  // before that decision is made deliberately.
  private readonly enforceQuotaEnabled: boolean;

  constructor(
    private readonly routingService: LLMRoutingService,
    private readonly quotaService: LLMQuotaService,
    private readonly configService: ConfigService,
  ) {
    this.enforceQuotaEnabled =
      (this.configService.get<string>('LLM_ENFORCE_QUOTA') || 'false')
        .toLowerCase() === 'true';
  }

  async generate(
    userId: string,
    seed: JobDescriptionSeed,
  ): Promise<JobDescriptionResponse> {
    if (this.enforceQuotaEnabled) {
      await this.quotaService.enforceQuota(
        userId,
        LLMFeature.GENERATE_JOB_DESCRIPTION,
      );
    }

    const provider = this.routingService.getProviderForFeature(
      LLMFeature.GENERATE_JOB_DESCRIPTION,
    );
    const config = this.routingService.getFeatureConfig(
      LLMFeature.GENERATE_JOB_DESCRIPTION,
    );

    const prompt = this.buildPrompt(seed);

    try {
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are an expert technical recruiter writing a job posting. Draft honest, specific, non-generic copy grounded ONLY in the facts given — never invent a company fact (headcount, funding, founding year, benefits, user/customer counts, revenue, awards, "millions of users" or similar scale/traction claims) that was not provided. Where a detail is not given, write generically ("our team", "a collaborative environment", "our platform") rather than fabricating a specific. The role itself (title, skills, seniority, location) IS given and should be described specifically and concretely — genericness is only for facts ABOUT THE COMPANY that were not supplied. Return ONLY valid JSON matching this schema:
{
  "description": "2-3 paragraph overview of the role and why it matters",
  "responsibilities": ["5-8 specific responsibility bullets"],
  "requirements": ["5-8 specific requirement bullets, most important first"],
  "benefits": ["3-6 benefit bullets — omit entirely (empty array) if nothing was given to ground them in"],
  "confidence": 0.85
}`,
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (error) {
        const jsonMatch =
          response.content.match(/```json\n([\s\S]*?)\n```/) ||
          response.content.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from LLM');
        }
      }

      const validated = JobDescriptionResponseSchema.parse(parsed);

      await this.quotaService.recordUsageAndIncrement(
        userId,
        LLMFeature.GENERATE_JOB_DESCRIPTION,
        provider.getName(),
        config.model,
        response.usage,
        { jobTitle: seed.title, companyName: seed.companyName },
      );

      return validated;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.logger.error('Zod validation error:', error.errors);
        throw new Error(
          `Invalid response format from LLM: ${error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      this.logger.error('Error generating job description:', error);
      throw error;
    }
  }

  private buildPrompt(seed: JobDescriptionSeed): string {
    let prompt = `Draft a job posting from these facts. Do not invent anything beyond them.\n\n`;
    prompt += `ROLE:\n`;
    prompt += `- Title: ${seed.title}\n`;
    if (seed.companyName) prompt += `- Company: ${seed.companyName}\n`;
    if (seed.location) prompt += `- Location: ${seed.location}\n`;
    prompt += `- Remote: ${seed.isRemote ? 'Yes' : 'No'}\n`;
    if (seed.jobType) prompt += `- Type: ${seed.jobType}\n`;
    if (seed.experience) prompt += `- Experience level: ${seed.experience}\n`;
    if (seed.educationLevel) prompt += `- Education: ${seed.educationLevel}\n`;
    if (seed.skills?.length) prompt += `- Key skills: ${seed.skills.join(', ')}\n`;
    if (seed.notes?.trim()) prompt += `- Employer notes: ${seed.notes.trim()}\n`;

    prompt += `\nWrite a description, responsibilities, requirements, and benefits (benefits: [] if nothing was given to ground them in) for this role. Be specific to the title and skills given, not generic filler.`;

    return prompt;
  }
}
