import { Injectable, Logger } from '@nestjs/common';
import { LLMRoutingService, LLMFeature } from '../../llm/llm-routing.service';
import { z } from 'zod';
// Define schemas locally until contracts package exports are fixed
const CoachingOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  questionCategory: z.string(),
  questionIntent: z.string(),
  recommendedFramework: z.enum(['STAR', 'PREP', 'PYRAMID', 'SYSTEM_DESIGN', 'TRACE', 'NONE']),
  frameworkSteps: z.array(z.string()),
  answerPlanVariants: z.array(z.any()),
  factCheck: z.object({
    items: z.array(z.any()),
    hasBlockingIssues: z.boolean(),
  }),
  personalization: z.object({
    missingInfoQuestions: z.array(z.string()),
    suggestedImprovements: z.array(z.string()),
  }),
});
type CoachingOutput = z.infer<typeof CoachingOutputSchema>;
type SessionContextPack = any; // Temporary until contracts package is fixed
import { PromptVersion, PromptVersionDocument } from '../../schemas/prompt-version.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CoachingService {
  private readonly logger = new Logger(CoachingService.name);

  constructor(
    private readonly llmRouting: LLMRoutingService,
    @InjectModel(PromptVersion.name) private promptVersionModel: Model<PromptVersionDocument>,
  ) {}

  async generateCoaching(
    contextPack: SessionContextPack,
    questionText: string,
  ): Promise<CoachingOutput> {
    try {
      // Get coaching prompt template
      const promptTemplate = await this.getPromptTemplate('INTERVIEW_COACHING_V1');
      
      // Build prompt with context pack and question
      const prompt = this.buildCoachingPrompt(promptTemplate, contextPack, questionText);

      // Call LLM
      const response = await this.llmRouting.getProviderForFeature(
        LLMFeature.INTERVIEW_COACHING,
      ).chat({
        messages: [
          {
            role: 'system',
            content: 'You are Interview Buddy in PRACTICE/CONSENT/LIVE_NOTES. You must provide coaching and an answer plan, not a verbatim script. Do NOT invent achievements. If an important detail is missing, ask for it under personalization.missingInfoQuestions. Return ONLY valid JSON matching CoachingOutputSchema v1.0.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      // Parse and validate response
      let parsed: any;
      try {
        parsed = JSON.parse(response.content);
      } catch (e) {
        this.logger.error('Failed to parse LLM response as JSON', e);
        throw new Error('Invalid JSON response from LLM');
      }

      // Validate with Zod schema
      const validated = CoachingOutputSchema.parse(parsed);
      return validated;
    } catch (error: any) {
      this.logger.error(`Failed to generate coaching: ${error.message}`, error.stack);
      
      // Return fallback coaching output
      return this.getFallbackCoaching(questionText);
    }
  }

  private async getPromptTemplate(key: string): Promise<string> {
    const prompt = await this.promptVersionModel.findOne({
      promptKey: key,
      isActive: true,
    });

    if (prompt) {
      return prompt.prompt;
    }

    // Return default template if not found in DB
    return this.getDefaultCoachingTemplate();
  }

  private buildCoachingPrompt(
    template: string,
    contextPack: SessionContextPack,
    questionText: string,
  ): string {
    return template
      .replace('{{contextPackJson}}', JSON.stringify(contextPack, null, 2))
      .replace('{{questionText}}', questionText);
  }

  private getDefaultCoachingTemplate(): string {
    return `SESSION_CONTEXT_PACK:
{{contextPackJson}}

QUESTION_TEXT:
{{questionText}}

INSTRUCTIONS:
- Detect the question category and intent.
- Recommend ONE framework and structure steps.
- Provide answerPlan variants for targetSeconds in constraints.answerTimeSecondsOptions (max 3 variants).
- Use resumeAnchorsUsed only if evidence exists.
- Provide factCheck items for any claim that could be unsupported.`;
  }

  private getFallbackCoaching(questionText: string): CoachingOutput {
    return {
      schemaVersion: '1.0',
      questionCategory: 'General',
      questionIntent: 'Answer the question clearly and concisely',
      recommendedFramework: 'STAR',
      frameworkSteps: [
        'Situation: Set the context',
        'Task: Describe what needed to be done',
        'Action: Explain what you did',
        'Result: Share the outcome',
      ],
      answerPlanVariants: [
        {
          targetSeconds: 60,
          structure: ['Introduction', 'Main points', 'Conclusion'],
          keyPoints: ['Be specific', 'Use examples', 'Show impact'],
          resumeAnchorsUsed: [],
        },
      ],
      factCheck: {
        items: [],
        hasBlockingIssues: false,
      },
      personalization: {
        missingInfoQuestions: [],
        suggestedImprovements: [],
      },
    };
  }
}

