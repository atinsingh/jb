import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromptVersion, PromptVersionDocument } from '../../schemas/prompt-version.schema';

const COACHING_PROMPT = `SYSTEM:
You are Interview Buddy in PRACTICE/CONSENT/LIVE_NOTES. You must provide coaching and an answer plan, not a verbatim script.
Do NOT invent achievements. If an important detail is missing, ask for it under personalization.missingInfoQuestions.
Return ONLY valid JSON matching CoachingOutputSchema v1.0.

USER:
SESSION_CONTEXT_PACK:
{{contextPackJson}}

QUESTION_TEXT:
{{questionText}}

INSTRUCTIONS:
- Detect the question category and intent.
- Recommend ONE framework and structure steps.
- Provide answerPlan variants for targetSeconds in constraints.answerTimeSecondsOptions (max 3 variants).
- Use resumeAnchorsUsed only if evidence exists.
- Provide factCheck items for any claim that could be unsupported.`;

const SCORING_PROMPT = `SYSTEM:
You are Interview Buddy scoring an answer using the provided rubric.
Return ONLY valid JSON matching ScoringOutputSchema v1.0.
Do not penalize for missing resume facts if the answer avoids making claims.
Be fair and actionable.

USER:
SESSION_CONTEXT_PACK:
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

const NEXT_QUESTIONS_PROMPT = `SYSTEM:
Generate next interview questions based on role, job description, and prior turns.
Return ONLY valid JSON matching QuestionPromptOutputSchema v1.0.

USER:
SESSION_CONTEXT_PACK:
{{contextPackJson}}

RECENT_TURNS (most recent first):
{{recentTurnsText}}

INSTRUCTIONS:
- Propose 3-5 questions, balanced across categories relevant to interviewType.
- Provide goodAnswerSignals for each question.`;

async function seedPrompts() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const promptModel = app.get<Model<PromptVersionDocument>>(
    getModelToken(PromptVersion.name),
  );

  const prompts = [
    {
      promptKey: 'INTERVIEW_COACHING_V1',
      version: '1.0.0',
      prompt: COACHING_PROMPT,
      description: 'Coaching prompt for interview questions - generates answer plans with evidence anchoring',
      isActive: true,
      metadata: {
        schemaVersion: '1.0',
        outputSchema: 'CoachingOutputSchema',
      },
    },
    {
      promptKey: 'INTERVIEW_SCORE_V1',
      version: '1.0.0',
      prompt: SCORING_PROMPT,
      description: 'Scoring prompt for interview answers - rubric-based evaluation',
      isActive: true,
      metadata: {
        schemaVersion: '1.0',
        outputSchema: 'ScoringOutputSchema',
      },
    },
    {
      promptKey: 'INTERVIEW_NEXT_QUESTIONS_V1',
      version: '1.0.0',
      prompt: NEXT_QUESTIONS_PROMPT,
      description: 'Next questions generator for practice mode interviews',
      isActive: true,
      metadata: {
        schemaVersion: '1.0',
        outputSchema: 'QuestionPromptOutputSchema',
      },
    },
  ];

  for (const promptData of prompts) {
    // Check if prompt already exists
    const existing = await promptModel.findOne({
      promptKey: promptData.promptKey,
      version: promptData.version,
    });

    if (existing) {
      console.log(`✓ Prompt ${promptData.promptKey} v${promptData.version} already exists, skipping...`);
      continue;
    }

    // Deactivate old versions
    await promptModel.updateMany(
      { promptKey: promptData.promptKey },
      { $set: { isActive: false } },
    );

    // Create new version
    await promptModel.create(promptData);
    console.log(`✓ Seeded prompt: ${promptData.promptKey} v${promptData.version}`);
  }

  console.log('\n✅ All prompts seeded successfully!');
  await app.close();
}

seedPrompts().catch((error) => {
  console.error('❌ Error seeding prompts:', error);
  process.exit(1);
});

