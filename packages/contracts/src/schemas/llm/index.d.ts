import { z } from 'zod';
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
    before?: string;
    after?: string;
    reason?: string;
    section?: string;
    action?: "updated" | "added" | "removed" | "reordered";
}, {
    before?: string;
    after?: string;
    reason?: string;
    section?: string;
    action?: "updated" | "added" | "removed" | "reordered";
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
        before?: string;
        after?: string;
        reason?: string;
        section?: string;
        action?: "updated" | "added" | "removed" | "reordered";
    }, {
        before?: string;
        after?: string;
        reason?: string;
        section?: string;
        action?: "updated" | "added" | "removed" | "reordered";
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
        before?: string;
        after?: string;
        reason?: string;
        section?: string;
        action?: "updated" | "added" | "removed" | "reordered";
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
        before?: string;
        after?: string;
        reason?: string;
        section?: string;
        action?: "updated" | "added" | "removed" | "reordered";
    }[];
}>;
export type ResumeTailoringResponse = z.infer<typeof ResumeTailoringResponseSchema>;
export type KeywordMap = z.infer<typeof KeywordMapSchema>;
export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>;
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
