import { z } from 'zod';

/**
 * Bullet Rewrite Schemas
 */
export const BulletDiffSchema = z.object({
  original: z.string(),
  improved: z.string(),
  changes: z.array(z.string()),
});

export const BulletRewriteResponseSchema = z.object({
  improvedBullets: z.array(z.string()),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  diffs: z.array(BulletDiffSchema),
});

export type BulletRewriteResponse = z.infer<typeof BulletRewriteResponseSchema>;
export type BulletDiff = z.infer<typeof BulletDiffSchema>;

/**
 * Resume Tailoring Schemas
 */
export const KeywordMapSchema = z.object({
  matched: z.array(z.string()),
  added: z.array(z.string()),
  removed: z.array(z.string()).optional(),
});

export const ChangeLogEntrySchema = z.object({
  section: z.string(),
  action: z.enum(['updated', 'added', 'removed', 'reordered']),
  reason: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
});

export const ResumeTailoringResponseSchema = z.object({
  updatedResume: z.record(z.any()), // Resume JSON structure
  keywordMap: KeywordMapSchema,
  changeLog: z.array(ChangeLogEntrySchema),
  confidence: z.number().min(0).max(1).optional(),
});

export type ResumeTailoringResponse = z.infer<typeof ResumeTailoringResponseSchema>;
export type KeywordMap = z.infer<typeof KeywordMapSchema>;
export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>;

/**
 * Cover Letter Schemas
 */
export const CoverLetterSectionsSchema = z.object({
  greeting: z.string(),
  introduction: z.string(),
  body: z.string(),
  closing: z.string(),
  signature: z.string(),
});

export const CoverLetterResponseSchema = z.object({
  sections: CoverLetterSectionsSchema,
  finalLetter: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});

export type CoverLetterResponse = z.infer<typeof CoverLetterResponseSchema>;
export type CoverLetterSections = z.infer<typeof CoverLetterSectionsSchema>;

/**
 * Job Match Schemas
 *
 * Validates the raw LLM output for candidate<>job match analysis. Mirrors the
 * legacy `AiProviderService.calculateJobMatch` return shape so the modern
 * `MatchCalculatorService` is a drop-in replacement.
 */
export const JobMatchResponseSchema = z.object({
  matchScore: z.number(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  reasoning: z.string(),
});

export type JobMatchResponse = z.infer<typeof JobMatchResponseSchema>;

/**
 * Resume Parse Schemas
 *
 * Validates the raw LLM output for resume text extraction. Mirrors the legacy
 * `AiProviderService.parseResume` return shape.
 */
export const ResumeParseExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  duration: z.string(),
  description: z.string(),
});

export const ResumeParseEducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string(),
});

export const ResumeParseResponseSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  summary: z.string(),
  skills: z.array(z.string()),
  experience: z.array(ResumeParseExperienceSchema),
  education: z.array(ResumeParseEducationSchema),
});

export type ResumeParseExperience = z.infer<typeof ResumeParseExperienceSchema>;
export type ResumeParseEducation = z.infer<typeof ResumeParseEducationSchema>;
export type ResumeParseResponse = z.infer<typeof ResumeParseResponseSchema>;

/**
 * Employer "AI Recruiter" Schemas
 *
 * These validate the RAW model output for the employer recruiting features.
 * Stable identity fields (candidate name/title/stage) and computed top-level
 * fields (total, jobId, hasContent) are NOT part of the LLM contract — the
 * service re-anchors the model output onto the deterministic result so the
 * final API return shape is byte-identical whether the LLM path or the
 * deterministic fallback produced it. The model is keyed on `id` (the
 * EmployerApplicant `_id`) so results can be joined back to real records.
 */

// Screen — per-applicant ranking output
export const RecruiterScreenItemSchema = z.object({
  id: z.string(),
  score: z.number(),
  recommendation: z.enum(['advance', 'review', 'hold']),
  rationale: z.string(),
});

export const RecruiterScreenResponseSchema = z.object({
  ranked: z.array(RecruiterScreenItemSchema),
});

export type RecruiterScreenItem = z.infer<typeof RecruiterScreenItemSchema>;
export type RecruiterScreenResponse = z.infer<
  typeof RecruiterScreenResponseSchema
>;

// Sourcing — per-candidate match + outreach output
export const RecruiterSourcingItemSchema = z.object({
  id: z.string(),
  matchScore: z.number(),
  outreach: z.string(),
});

export const RecruiterSourcingResponseSchema = z.object({
  candidates: z.array(RecruiterSourcingItemSchema),
});

export type RecruiterSourcingItem = z.infer<
  typeof RecruiterSourcingItemSchema
>;
export type RecruiterSourcingResponse = z.infer<
  typeof RecruiterSourcingResponseSchema
>;

// Copilot — reply only (actions stay deterministic so their `type`s are valid)
export const RecruiterCopilotResponseSchema = z.object({
  reply: z.string(),
});

export type RecruiterCopilotResponse = z.infer<
  typeof RecruiterCopilotResponseSchema
>;

// Interview scorecard — full structured object (minus computed `hasContent`)
export const RecruiterScorecardCompetencySchema = z.object({
  competency: z.string(),
  rating: z.number().min(1).max(5),
  evidence: z.string(),
});

export const RecruiterScorecardResponseSchema = z.object({
  overall: z.number(),
  recommendation: z.enum(['hire', 'lean_hire', 'lean_no_hire', 'no_hire']),
  competencies: z.array(RecruiterScorecardCompetencySchema),
  summary: z.string(),
  nextSteps: z.array(z.string()),
});

export type RecruiterScorecardCompetency = z.infer<
  typeof RecruiterScorecardCompetencySchema
>;
export type RecruiterScorecardResponse = z.infer<
  typeof RecruiterScorecardResponseSchema
>;

