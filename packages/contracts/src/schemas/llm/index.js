"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecruiterScorecardResponseSchema = exports.RecruiterScorecardCompetencySchema = exports.RecruiterCopilotResponseSchema = exports.RecruiterSourcingResponseSchema = exports.RecruiterSourcingItemSchema = exports.RecruiterScreenResponseSchema = exports.RecruiterScreenItemSchema = exports.ResumeParseResponseSchema = exports.ResumeParseEducationSchema = exports.ResumeParseExperienceSchema = exports.JobMatchResponseSchema = exports.CoverLetterResponseSchema = exports.CoverLetterSectionsSchema = exports.ResumeTailoringResponseSchema = exports.ChangeLogEntrySchema = exports.KeywordMapSchema = exports.BulletRewriteResponseSchema = exports.BulletDiffSchema = void 0;
const zod_1 = require("zod");
/**
 * Bullet Rewrite Schemas
 */
exports.BulletDiffSchema = zod_1.z.object({
    original: zod_1.z.string(),
    improved: zod_1.z.string(),
    changes: zod_1.z.array(zod_1.z.string()),
});
exports.BulletRewriteResponseSchema = zod_1.z.object({
    improvedBullets: zod_1.z.array(zod_1.z.string()),
    rationale: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    diffs: zod_1.z.array(exports.BulletDiffSchema),
});
/**
 * Resume Tailoring Schemas
 */
exports.KeywordMapSchema = zod_1.z.object({
    matched: zod_1.z.array(zod_1.z.string()),
    added: zod_1.z.array(zod_1.z.string()),
    removed: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ChangeLogEntrySchema = zod_1.z.object({
    section: zod_1.z.string(),
    action: zod_1.z.enum(['updated', 'added', 'removed', 'reordered']),
    reason: zod_1.z.string(),
    before: zod_1.z.string().optional(),
    after: zod_1.z.string().optional(),
});
exports.ResumeTailoringResponseSchema = zod_1.z.object({
    updatedResume: zod_1.z.record(zod_1.z.any()), // Resume JSON structure
    keywordMap: exports.KeywordMapSchema,
    changeLog: zod_1.z.array(exports.ChangeLogEntrySchema),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * Cover Letter Schemas
 */
exports.CoverLetterSectionsSchema = zod_1.z.object({
    greeting: zod_1.z.string(),
    introduction: zod_1.z.string(),
    body: zod_1.z.string(),
    closing: zod_1.z.string(),
    signature: zod_1.z.string(),
});
exports.CoverLetterResponseSchema = zod_1.z.object({
    sections: exports.CoverLetterSectionsSchema,
    finalLetter: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
/**
 * Job Match Schemas
 */
exports.JobMatchResponseSchema = zod_1.z.object({
    matchScore: zod_1.z.number(),
    matchedSkills: zod_1.z.array(zod_1.z.string()),
    missingSkills: zod_1.z.array(zod_1.z.string()),
    reasoning: zod_1.z.string(),
});
/**
 * Resume Parse Schemas
 */
exports.ResumeParseExperienceSchema = zod_1.z.object({
    title: zod_1.z.string(),
    company: zod_1.z.string(),
    duration: zod_1.z.string(),
    description: zod_1.z.string(),
});
exports.ResumeParseEducationSchema = zod_1.z.object({
    degree: zod_1.z.string(),
    institution: zod_1.z.string(),
    year: zod_1.z.string(),
});
exports.ResumeParseResponseSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string(),
    phone: zod_1.z.string(),
    summary: zod_1.z.string(),
    skills: zod_1.z.array(zod_1.z.string()),
    experience: zod_1.z.array(exports.ResumeParseExperienceSchema),
    education: zod_1.z.array(exports.ResumeParseEducationSchema),
});
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
exports.RecruiterScreenItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    score: zod_1.z.number(),
    recommendation: zod_1.z.enum(['advance', 'review', 'hold']),
    rationale: zod_1.z.string(),
});
exports.RecruiterScreenResponseSchema = zod_1.z.object({
    ranked: zod_1.z.array(exports.RecruiterScreenItemSchema),
});
// Sourcing — per-candidate match + outreach output
exports.RecruiterSourcingItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    matchScore: zod_1.z.number(),
    outreach: zod_1.z.string(),
});
exports.RecruiterSourcingResponseSchema = zod_1.z.object({
    candidates: zod_1.z.array(exports.RecruiterSourcingItemSchema),
});
// Copilot — reply only (actions stay deterministic so their `type`s are valid)
exports.RecruiterCopilotResponseSchema = zod_1.z.object({
    reply: zod_1.z.string(),
});
// Interview scorecard — full structured object (minus computed `hasContent`)
exports.RecruiterScorecardCompetencySchema = zod_1.z.object({
    competency: zod_1.z.string(),
    rating: zod_1.z.number().min(1).max(5),
    evidence: zod_1.z.string(),
});
exports.RecruiterScorecardResponseSchema = zod_1.z.object({
    overall: zod_1.z.number(),
    recommendation: zod_1.z.enum(['hire', 'lean_hire', 'lean_no_hire', 'no_hire']),
    competencies: zod_1.z.array(exports.RecruiterScorecardCompetencySchema),
    summary: zod_1.z.string(),
    nextSteps: zod_1.z.array(zod_1.z.string()),
});
//# sourceMappingURL=index.js.map