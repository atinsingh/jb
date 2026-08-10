import { z } from 'zod';
/**
 * Bullet Rewrite Schemas
 */
export declare const BulletDiffSchema: z.ZodObject<{
    original: z.ZodString;
    improved: z.ZodString;
    changes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    original?: string;
    improved?: string;
    changes?: string[];
}, {
    original?: string;
    improved?: string;
    changes?: string[];
}>;
export declare const BulletRewriteResponseSchema: z.ZodObject<{
    improvedBullets: z.ZodArray<z.ZodString, "many">;
    rationale: z.ZodString;
    confidence: z.ZodNumber;
    diffs: z.ZodArray<z.ZodObject<{
        original: z.ZodString;
        improved: z.ZodString;
        changes: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        original?: string;
        improved?: string;
        changes?: string[];
    }, {
        original?: string;
        improved?: string;
        changes?: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    improvedBullets?: string[];
    rationale?: string;
    confidence?: number;
    diffs?: {
        original?: string;
        improved?: string;
        changes?: string[];
    }[];
}, {
    improvedBullets?: string[];
    rationale?: string;
    confidence?: number;
    diffs?: {
        original?: string;
        improved?: string;
        changes?: string[];
    }[];
}>;
export type BulletRewriteResponse = z.infer<typeof BulletRewriteResponseSchema>;
export type BulletDiff = z.infer<typeof BulletDiffSchema>;
/**
 * Resume Tailoring Schemas
 */
export declare const KeywordMapSchema: z.ZodObject<{
    matched: z.ZodArray<z.ZodString, "many">;
    added: z.ZodArray<z.ZodString, "many">;
    removed: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    matched?: string[];
    added?: string[];
    removed?: string[];
}, {
    matched?: string[];
    added?: string[];
    removed?: string[];
}>;
export declare const ChangeLogEntrySchema: z.ZodObject<{
    section: z.ZodString;
    action: z.ZodEnum<["updated", "added", "removed", "reordered"]>;
    reason: z.ZodString;
    before: z.ZodOptional<z.ZodString>;
    after: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    section?: string;
    action?: "added" | "removed" | "updated" | "reordered";
    reason?: string;
    before?: string;
    after?: string;
}, {
    section?: string;
    action?: "added" | "removed" | "updated" | "reordered";
    reason?: string;
    before?: string;
    after?: string;
}>;
export declare const ResumeTailoringResponseSchema: z.ZodObject<{
    updatedResume: z.ZodRecord<z.ZodString, z.ZodAny>;
    keywordMap: z.ZodObject<{
        matched: z.ZodArray<z.ZodString, "many">;
        added: z.ZodArray<z.ZodString, "many">;
        removed: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        matched?: string[];
        added?: string[];
        removed?: string[];
    }, {
        matched?: string[];
        added?: string[];
        removed?: string[];
    }>;
    changeLog: z.ZodArray<z.ZodObject<{
        section: z.ZodString;
        action: z.ZodEnum<["updated", "added", "removed", "reordered"]>;
        reason: z.ZodString;
        before: z.ZodOptional<z.ZodString>;
        after: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        section?: string;
        action?: "added" | "removed" | "updated" | "reordered";
        reason?: string;
        before?: string;
        after?: string;
    }, {
        section?: string;
        action?: "added" | "removed" | "updated" | "reordered";
        reason?: string;
        before?: string;
        after?: string;
    }>, "many">;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    updatedResume?: Record<string, any>;
    keywordMap?: {
        matched?: string[];
        added?: string[];
        removed?: string[];
    };
    changeLog?: {
        section?: string;
        action?: "added" | "removed" | "updated" | "reordered";
        reason?: string;
        before?: string;
        after?: string;
    }[];
}, {
    confidence?: number;
    updatedResume?: Record<string, any>;
    keywordMap?: {
        matched?: string[];
        added?: string[];
        removed?: string[];
    };
    changeLog?: {
        section?: string;
        action?: "added" | "removed" | "updated" | "reordered";
        reason?: string;
        before?: string;
        after?: string;
    }[];
}>;
export type ResumeTailoringResponse = z.infer<typeof ResumeTailoringResponseSchema>;
export type KeywordMap = z.infer<typeof KeywordMapSchema>;
export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>;
/**
 * Cover Letter Schemas
 */
export declare const CoverLetterSectionsSchema: z.ZodObject<{
    greeting: z.ZodString;
    introduction: z.ZodString;
    body: z.ZodString;
    closing: z.ZodString;
    signature: z.ZodString;
}, "strip", z.ZodTypeAny, {
    greeting?: string;
    introduction?: string;
    body?: string;
    closing?: string;
    signature?: string;
}, {
    greeting?: string;
    introduction?: string;
    body?: string;
    closing?: string;
    signature?: string;
}>;
export declare const CoverLetterResponseSchema: z.ZodObject<{
    sections: z.ZodObject<{
        greeting: z.ZodString;
        introduction: z.ZodString;
        body: z.ZodString;
        closing: z.ZodString;
        signature: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        greeting?: string;
        introduction?: string;
        body?: string;
        closing?: string;
        signature?: string;
    }, {
        greeting?: string;
        introduction?: string;
        body?: string;
        closing?: string;
        signature?: string;
    }>;
    finalLetter: z.ZodString;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    confidence?: number;
    sections?: {
        greeting?: string;
        introduction?: string;
        body?: string;
        closing?: string;
        signature?: string;
    };
    finalLetter?: string;
}, {
    confidence?: number;
    sections?: {
        greeting?: string;
        introduction?: string;
        body?: string;
        closing?: string;
        signature?: string;
    };
    finalLetter?: string;
}>;
export type CoverLetterResponse = z.infer<typeof CoverLetterResponseSchema>;
export type CoverLetterSections = z.infer<typeof CoverLetterSectionsSchema>;
/**
 * Job Match Schemas
 */
export declare const JobMatchResponseSchema: z.ZodObject<{
    matchScore: z.ZodNumber;
    matchedSkills: z.ZodArray<z.ZodString, "many">;
    missingSkills: z.ZodArray<z.ZodString, "many">;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    reasoning?: string;
}, {
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    reasoning?: string;
}>;
export type JobMatchResponse = z.infer<typeof JobMatchResponseSchema>;
/**
 * Resume Parse Schemas
 */
export declare const ResumeParseExperienceSchema: z.ZodObject<{
    title: z.ZodString;
    company: z.ZodString;
    duration: z.ZodString;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
}, {
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
}>;
export declare const ResumeParseEducationSchema: z.ZodObject<{
    degree: z.ZodString;
    institution: z.ZodString;
    year: z.ZodString;
}, "strip", z.ZodTypeAny, {
    degree?: string;
    institution?: string;
    year?: string;
}, {
    degree?: string;
    institution?: string;
    year?: string;
}>;
export declare const ResumeParseResponseSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    summary: z.ZodString;
    skills: z.ZodArray<z.ZodString, "many">;
    experience: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        company: z.ZodString;
        duration: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, any, any>, "many">;
    education: z.ZodArray<z.ZodObject<{
        degree: z.ZodString;
        institution: z.ZodString;
        year: z.ZodString;
    }, "strip", z.ZodTypeAny, any, any>, "many">;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    skills?: string[];
    experience?: any[];
    education?: any[];
}, {
    name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    skills?: string[];
    experience?: any[];
    education?: any[];
}>;
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
export declare const RecruiterScreenItemSchema: z.ZodObject<{
    id: z.ZodString;
    score: z.ZodNumber;
    recommendation: z.ZodEnum<["advance", "review", "hold"]>;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rationale?: string;
    id?: string;
    score?: number;
    recommendation?: "advance" | "review" | "hold";
}, {
    rationale?: string;
    id?: string;
    score?: number;
    recommendation?: "advance" | "review" | "hold";
}>;
export declare const RecruiterScreenResponseSchema: z.ZodObject<{
    ranked: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        score: z.ZodNumber;
        recommendation: z.ZodEnum<["advance", "review", "hold"]>;
        rationale: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rationale?: string;
        id?: string;
        score?: number;
        recommendation?: "advance" | "review" | "hold";
    }, {
        rationale?: string;
        id?: string;
        score?: number;
        recommendation?: "advance" | "review" | "hold";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    ranked?: {
        rationale?: string;
        id?: string;
        score?: number;
        recommendation?: "advance" | "review" | "hold";
    }[];
}, {
    ranked?: {
        rationale?: string;
        id?: string;
        score?: number;
        recommendation?: "advance" | "review" | "hold";
    }[];
}>;
export type RecruiterScreenItem = z.infer<typeof RecruiterScreenItemSchema>;
export type RecruiterScreenResponse = z.infer<typeof RecruiterScreenResponseSchema>;
export declare const RecruiterSourcingItemSchema: z.ZodObject<{
    id: z.ZodString;
    matchScore: z.ZodNumber;
    outreach: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
    matchScore?: number;
    outreach?: string;
}, {
    id?: string;
    matchScore?: number;
    outreach?: string;
}>;
export declare const RecruiterSourcingResponseSchema: z.ZodObject<{
    candidates: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        matchScore: z.ZodNumber;
        outreach: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id?: string;
        matchScore?: number;
        outreach?: string;
    }, {
        id?: string;
        matchScore?: number;
        outreach?: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    candidates?: {
        id?: string;
        matchScore?: number;
        outreach?: string;
    }[];
}, {
    candidates?: {
        id?: string;
        matchScore?: number;
        outreach?: string;
    }[];
}>;
export type RecruiterSourcingItem = z.infer<typeof RecruiterSourcingItemSchema>;
export type RecruiterSourcingResponse = z.infer<typeof RecruiterSourcingResponseSchema>;
export declare const RecruiterCopilotResponseSchema: z.ZodObject<{
    reply: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reply?: string;
}, {
    reply?: string;
}>;
export type RecruiterCopilotResponse = z.infer<typeof RecruiterCopilotResponseSchema>;
export declare const RecruiterScorecardCompetencySchema: z.ZodObject<{
    competency: z.ZodString;
    rating: z.ZodNumber;
    evidence: z.ZodString;
}, "strip", z.ZodTypeAny, {
    competency?: string;
    rating?: number;
    evidence?: string;
}, {
    competency?: string;
    rating?: number;
    evidence?: string;
}>;
export declare const RecruiterScorecardResponseSchema: z.ZodObject<{
    overall: z.ZodNumber;
    recommendation: z.ZodEnum<["hire", "lean_hire", "lean_no_hire", "no_hire"]>;
    competencies: z.ZodArray<z.ZodObject<{
        competency: z.ZodString;
        rating: z.ZodNumber;
        evidence: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        competency?: string;
        rating?: number;
        evidence?: string;
    }, {
        competency?: string;
        rating?: number;
        evidence?: string;
    }>, "many">;
    summary: z.ZodString;
    nextSteps: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    recommendation?: "hire" | "lean_hire" | "lean_no_hire" | "no_hire";
    overall?: number;
    competencies?: {
        competency?: string;
        rating?: number;
        evidence?: string;
    }[];
    summary?: string;
    nextSteps?: string[];
}, {
    recommendation?: "hire" | "lean_hire" | "lean_no_hire" | "no_hire";
    overall?: number;
    competencies?: {
        competency?: string;
        rating?: number;
        evidence?: string;
    }[];
    summary?: string;
    nextSteps?: string[];
}>;
export type RecruiterScorecardCompetency = z.infer<typeof RecruiterScorecardCompetencySchema>;
export type RecruiterScorecardResponse = z.infer<typeof RecruiterScorecardResponseSchema>;
