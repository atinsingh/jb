import { z } from 'zod';

/**
 * Shared primitives
 */
export const ISODateTime = z.string().datetime();
export const UUID = z.string().uuid();

export const ModeEnum = z.enum(['PRACTICE', 'CONSENT', 'LIVE_NOTES']);
export const TurnTypeEnum = z.enum(['QUESTION', 'ANSWER', 'COACHING', 'SYSTEM']);

export const SeniorityEnum = z.enum([
  'INTERN',
  'JUNIOR',
  'MID',
  'SENIOR',
  'STAFF',
  'PRINCIPAL',
  'MANAGER',
]);
export const InterviewTypeEnum = z.enum([
  'BEHAVIORAL',
  'TECHNICAL',
  'SYSTEM_DESIGN',
  'CODING',
  'CASE',
  'MIXED',
]);

export const Confidence01 = z.number().min(0).max(1);

/**
 * Evidence anchoring
 * - Used to prevent invented claims: every claim can be linked to resume evidence.
 */
export const EvidenceRefSchema = z.object({
  source: z.enum(['RESUME', 'PROFILE', 'JOB_DESCRIPTION', 'USER_NOTE']),
  sourceId: z.string().optional(), // resumeVersionId, profileId, jobId, etc.
  quote: z.string().min(1).max(500).optional(), // short excerpt (optional)
  section: z.string().optional(), // e.g., "Experience: ACME - Project X"
});

/**
 * Session Context Pack (immutable snapshot per session)
 */
export const CandidateSnapshotSchema = z.object({
  headline: z.string().min(1).max(120),
  summaryBullets: z.array(z.string().min(1).max(240)).min(1).max(12),
  coreSkills: z.array(z.string().min(1).max(80)).min(3).max(40),
  domainTags: z.array(z.string().min(1).max(80)).max(20).default([]),
  achievements: z
    .array(
      z.object({
        text: z.string().min(1).max(240),
        evidence: z.array(EvidenceRefSchema).min(1),
        confidence: Confidence01,
        needsUserConfirmation: z.boolean().default(false),
      }),
    )
    .max(30)
    .default([]),
});

export const JobSnapshotSchema = z.object({
  jobTitle: z.string().min(1).max(140),
  companyName: z.string().min(1).max(140).optional(),
  location: z.string().max(140).optional(),
  responsibilities: z.array(z.string().min(1).max(300)).min(1).max(20),
  requiredSkills: z.array(z.string().min(1).max(80)).min(1).max(40),
  preferredSkills: z.array(z.string().min(1).max(80)).max(40).default([]),
  keywords: z.array(z.string().min(1).max(80)).max(60).default([]),
});

export const SessionConstraintsSchema = z.object({
  answerTimeSecondsOptions: z
    .array(z.number().int().min(15).max(300))
    .min(1)
    .default([30, 60, 120]),
  style: z.enum(['CONCISE', 'BALANCED', 'DETAILED']).default('BALANCED'),
  language: z.string().default('en'),
});

export const RubricDimensionKeySchema = z.string().min(2).max(64);

export const RubricSchema = z.object({
  rubricId: z.string().min(3).max(80),
  roleFamily: z.enum(['SWE_BACKEND', 'DEVOPS_CLOUD', 'PM', 'DATA']),
  interviewType: InterviewTypeEnum,
  seniority: SeniorityEnum,
  dimensions: z
    .array(
      z.object({
        key: RubricDimensionKeySchema,
        name: z.string().min(2).max(80),
        description: z.string().min(5).max(400),
        weight: z.number().min(0).max(1),
        anchors: z.object({
          score1: z.string().min(5).max(240),
          score3: z.string().min(5).max(240),
          score5: z.string().min(5).max(240),
        }),
      }),
    )
    .min(4)
    .max(12),
});

export const SessionContextPackSchema = z.object({
  schemaVersion: z.literal('1.0'),
  sessionId: UUID,
  mode: ModeEnum,
  resumeVersionId: UUID.optional(),
  jobId: UUID.optional(),
  targetRoleTitle: z.string().min(2).max(140),
  roleFamily: z.enum(['SWE_BACKEND', 'DEVOPS_CLOUD', 'PM', 'DATA']),
  seniority: SeniorityEnum,
  interviewType: InterviewTypeEnum,
  candidate: CandidateSnapshotSchema,
  job: JobSnapshotSchema,
  constraints: SessionConstraintsSchema,
  rubric: RubricSchema,
  createdAt: ISODateTime,
});

/**
 * Transcript segments (from STT or typed)
 */
export const TranscriptSegmentSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  text: z.string().min(1).max(2000),
  confidence: Confidence01.optional(),
  speaker: z.enum(['INTERVIEWER', 'CANDIDATE', 'UNKNOWN']).default('UNKNOWN'),
});

/**
 * Turn payload used across UI/back-end
 */
export const InterviewTurnSchema = z.object({
  id: UUID,
  sessionId: UUID,
  type: TurnTypeEnum,
  createdAt: ISODateTime,
  text: z.string().min(1).max(12000),
  segments: z.array(TranscriptSegmentSchema).optional(),
  sttConfidence: Confidence01.optional(),
});

/**
 * Coaching output (structured, UI-friendly)
 * - "Answer plan" instead of "final answer script"
 */
export const FrameworkEnum = z.enum([
  'STAR',
  'PREP',
  'PYRAMID',
  'SYSTEM_DESIGN',
  'TRACE',
  'NONE',
]);

export const FactCheckItemSchema = z.object({
  claim: z.string().min(3).max(240),
  status: z.enum(['SUPPORTED', 'UNSUPPORTED', 'NEEDS_USER_CONFIRMATION']),
  suggestedFix: z.string().min(3).max(240).optional(),
  evidence: z.array(EvidenceRefSchema).default([]),
});

export const AnswerPlanVariantSchema = z.object({
  targetSeconds: z.number().int().min(15).max(300),
  structure: z.array(z.string().min(3).max(200)).min(2).max(10),
  keyPoints: z.array(z.string().min(3).max(200)).min(1).max(8),
  resumeAnchorsUsed: z.array(EvidenceRefSchema).default([]),
});

export const CoachingOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  questionCategory: z.string().min(2).max(80),
  questionIntent: z.string().min(5).max(200),
  recommendedFramework: FrameworkEnum,
  frameworkSteps: z.array(z.string().min(5).max(200)).min(2).max(8),
  answerPlanVariants: z.array(AnswerPlanVariantSchema).min(1).max(3),
  factCheck: z.object({
    items: z.array(FactCheckItemSchema).default([]),
    hasBlockingIssues: z.boolean().default(false),
  }),
  personalization: z.object({
    missingInfoQuestions: z.array(z.string().min(5).max(200)).default([]),
    suggestedImprovements: z.array(z.string().min(5).max(200)).default([]),
  }),
});

/**
 * Scoring output
 */
export const DimensionScoreSchema = z.object({
  dimensionKey: RubricDimensionKeySchema,
  score: z.number().int().min(1).max(5),
  rationale: z.string().min(10).max(500),
  improvements: z.array(z.string().min(5).max(200)).default([]),
});

export const ScoringOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  dimensionScores: z.array(DimensionScoreSchema).min(1),
  overallScore: z.number().min(1).max(5),
  summary: z.string().min(10).max(1000),
  drills: z.array(z.string().min(5).max(200)).max(6).default([]),
  fillerWords: z.array(z.string().min(1).max(20)).default([]),
  strengths: z.array(z.string().min(5).max(200)).default([]),
  weaknesses: z.array(z.string().min(5).max(200)).default([]),
});

/**
 * Next questions generator output
 */
export const QuestionPromptOutputSchema = z.object({
  schemaVersion: z.literal('1.0'),
  questions: z.array(
    z.object({
      text: z.string().min(10).max(500),
      category: z.string().min(2).max(80),
      goodAnswerSignals: z.array(z.string().min(5).max(200)).min(1).max(5),
    }),
  ).min(3).max(5),
});

// Export types
export type Mode = z.infer<typeof ModeEnum>;
export type TurnType = z.infer<typeof TurnTypeEnum>;
export type Seniority = z.infer<typeof SeniorityEnum>;
export type InterviewType = z.infer<typeof InterviewTypeEnum>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
export type CandidateSnapshot = z.infer<typeof CandidateSnapshotSchema>;
export type JobSnapshot = z.infer<typeof JobSnapshotSchema>;
export type SessionConstraints = z.infer<typeof SessionConstraintsSchema>;
export type Rubric = z.infer<typeof RubricSchema>;
export type SessionContextPack = z.infer<typeof SessionContextPackSchema>;
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;
export type Framework = z.infer<typeof FrameworkEnum>;
export type FactCheckItem = z.infer<typeof FactCheckItemSchema>;
export type AnswerPlanVariant = z.infer<typeof AnswerPlanVariantSchema>;
export type CoachingOutput = z.infer<typeof CoachingOutputSchema>;
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;
export type ScoringOutput = z.infer<typeof ScoringOutputSchema>;
export type QuestionPromptOutput = z.infer<typeof QuestionPromptOutputSchema>;

