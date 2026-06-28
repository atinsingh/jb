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

