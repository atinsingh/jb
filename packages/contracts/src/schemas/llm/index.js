"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoverLetterResponseSchema = exports.CoverLetterSectionsSchema = exports.ResumeTailoringResponseSchema = exports.ChangeLogEntrySchema = exports.KeywordMapSchema = exports.BulletRewriteResponseSchema = exports.BulletDiffSchema = void 0;
const zod_1 = require("zod");
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
    updatedResume: zod_1.z.record(zod_1.z.any()),
    keywordMap: exports.KeywordMapSchema,
    changeLog: zod_1.z.array(exports.ChangeLogEntrySchema),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
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
//# sourceMappingURL=index.js.map