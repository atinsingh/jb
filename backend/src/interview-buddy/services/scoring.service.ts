import { Injectable, Logger } from '@nestjs/common';
import { LLMRoutingService, LLMFeature } from '../../llm/llm-routing.service';
import { z } from 'zod';
// Define schemas locally until contracts package exports are fixed
const ScoringOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  dimensionScores: z.array(z.any()),
  overallScore: z.number().min(1).max(5),
  summary: z.string(),
  drills: z.array(z.string()),
  fillerWords: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});
type ScoringOutput = z.infer<typeof ScoringOutputSchema>;
type SessionContextPack = any; // Temporary until contracts package is fixed
import { PromptVersion, PromptVersionDocument } from '../../schemas/prompt-version.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly llmRouting: LLMRoutingService,
    @InjectModel(PromptVersion.name) private promptVersionModel: Model<PromptVersionDocument>,
  ) {}

  async scoreAnswer(
    contextPack: SessionContextPack,
    questionText: string,
    answerText: string,
  ): Promise<ScoringOutput> {
    try {
      // Get scoring prompt template
      const promptTemplate = await this.getPromptTemplate('INTERVIEW_SCORE_V1');
      
      // Build prompt
      const prompt = this.buildScoringPrompt(promptTemplate, contextPack, questionText, answerText);

      // Call LLM
      const response = await this.llmRouting.getProviderForFeature(
        LLMFeature.INTERVIEW_SCORING,
      ).chat({
        messages: [
          {
            role: 'system',
            content: 'You are Interview Buddy scoring an answer using the provided rubric. Return ONLY valid JSON matching ScoringOutputSchema v1.0. Do not penalize for missing resume facts if the answer avoids making claims. Be fair and actionable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
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
      const validated = ScoringOutputSchema.parse(parsed);
      return validated;
    } catch (error: any) {
      this.logger.error(`Failed to score answer: ${error.message}`, error.stack);
      
      // Return fallback scoring output
      return this.getFallbackScoring();
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
    return this.getDefaultScoringTemplate();
  }

  private buildScoringPrompt(
    template: string,
    contextPack: SessionContextPack,
    questionText: string,
    answerText: string,
  ): string {
    return template
      .replace('{{contextPackJson}}', JSON.stringify(contextPack, null, 2))
      .replace('{{questionText}}', questionText)
      .replace('{{answerText}}', answerText)
      .replace('{{rubricJson}}', JSON.stringify(contextPack.rubric, null, 2));
  }

  private getDefaultScoringTemplate(): string {
    return `SESSION_CONTEXT_PACK:
{{contextPackJson}}

QUESTION_TEXT:
{{questionText}}

ANSWER_TEXT:
{{answerText}}

RUBRIC:
{{rubricJson}}

INSTRUCTIONS:
- Score each rubric dimension 1-5 with rationale and improvements.
- Provide overall score (1-5) and summary.
- Suggest up to 6 drills.
- Identify filler words only if clearly present.`;
  }

  private getFallbackScoring(): ScoringOutput {
    return {
      schemaVersion: '1.0',
      dimensionScores: [],
      overallScore: 3,
      summary: 'Unable to score answer. Please try again.',
      drills: [],
      fillerWords: [],
      strengths: [],
      weaknesses: [],
    };
  }
}

