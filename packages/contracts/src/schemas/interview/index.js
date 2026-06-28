"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionPromptOutputSchema = exports.ScoringOutputSchema = exports.DimensionScoreSchema = exports.CoachingOutputSchema = exports.AnswerPlanVariantSchema = exports.FactCheckItemSchema = exports.FrameworkEnum = exports.InterviewTurnSchema = exports.TranscriptSegmentSchema = exports.SessionContextPackSchema = exports.RubricSchema = exports.RubricDimensionKeySchema = exports.SessionConstraintsSchema = exports.JobSnapshotSchema = exports.CandidateSnapshotSchema = exports.EvidenceRefSchema = exports.Confidence01 = exports.InterviewTypeEnum = exports.SeniorityEnum = exports.TurnTypeEnum = exports.ModeEnum = exports.UUID = exports.ISODateTime = void 0;
const zod_1 = require("zod");
exports.ISODateTime = zod_1.z.string().datetime();
exports.UUID = zod_1.z.string().uuid();
exports.ModeEnum = zod_1.z.enum(['PRACTICE', 'CONSENT', 'LIVE_NOTES']);
exports.TurnTypeEnum = zod_1.z.enum(['QUESTION', 'ANSWER', 'COACHING', 'SYSTEM']);
exports.SeniorityEnum = zod_1.z.enum([
    'INTERN',
    'JUNIOR',
    'MID',
    'SENIOR',
    'STAFF',
    'PRINCIPAL',
    'MANAGER',
]);
exports.InterviewTypeEnum = zod_1.z.enum([
    'BEHAVIORAL',
    'TECHNICAL',
    'SYSTEM_DESIGN',
    'CODING',
    'CASE',
    'MIXED',
]);
exports.Confidence01 = zod_1.z.number().min(0).max(1);
exports.EvidenceRefSchema = zod_1.z.object({
    source: zod_1.z.enum(['RESUME', 'PROFILE', 'JOB_DESCRIPTION', 'USER_NOTE']),
    sourceId: zod_1.z.string().optional(),
    quote: zod_1.z.string().min(1).max(500).optional(),
    section: zod_1.z.string().optional(),
});
exports.CandidateSnapshotSchema = zod_1.z.object({
    headline: zod_1.z.string().min(1).max(120),
    summaryBullets: zod_1.z.array(zod_1.z.string().min(1).max(240)).min(1).max(12),
    coreSkills: zod_1.z.array(zod_1.z.string().min(1).max(80)).min(3).max(40),
    domainTags: zod_1.z.array(zod_1.z.string().min(1).max(80)).max(20).default([]),
    achievements: zod_1.z
        .array(zod_1.z.object({
        text: zod_1.z.string().min(1).max(240),
        evidence: zod_1.z.array(exports.EvidenceRefSchema).min(1),
        confidence: exports.Confidence01,
        needsUserConfirmation: zod_1.z.boolean().default(false),
    }))
        .max(30)
        .default([]),
});
exports.JobSnapshotSchema = zod_1.z.object({
    jobTitle: zod_1.z.string().min(1).max(140),
    companyName: zod_1.z.string().min(1).max(140).optional(),
    location: zod_1.z.string().max(140).optional(),
    responsibilities: zod_1.z.array(zod_1.z.string().min(1).max(300)).min(1).max(20),
    requiredSkills: zod_1.z.array(zod_1.z.string().min(1).max(80)).min(1).max(40),
    preferredSkills: zod_1.z.array(zod_1.z.string().min(1).max(80)).max(40).default([]),
    keywords: zod_1.z.array(zod_1.z.string().min(1).max(80)).max(60).default([]),
});
exports.SessionConstraintsSchema = zod_1.z.object({
    answerTimeSecondsOptions: zod_1.z
        .array(zod_1.z.number().int().min(15).max(300))
        .min(1)
        .default([30, 60, 120]),
    style: zod_1.z.enum(['CONCISE', 'BALANCED', 'DETAILED']).default('BALANCED'),
    language: zod_1.z.string().default('en'),
});
exports.RubricDimensionKeySchema = zod_1.z.string().min(2).max(64);
exports.RubricSchema = zod_1.z.object({
    rubricId: zod_1.z.string().min(3).max(80),
    roleFamily: zod_1.z.enum(['SWE_BACKEND', 'DEVOPS_CLOUD', 'PM', 'DATA']),
    interviewType: exports.InterviewTypeEnum,
    seniority: exports.SeniorityEnum,
    dimensions: zod_1.z
        .array(zod_1.z.object({
        key: exports.RubricDimensionKeySchema,
        name: zod_1.z.string().min(2).max(80),
        description: zod_1.z.string().min(5).max(400),
        weight: zod_1.z.number().min(0).max(1),
        anchors: zod_1.z.object({
            score1: zod_1.z.string().min(5).max(240),
            score3: zod_1.z.string().min(5).max(240),
            score5: zod_1.z.string().min(5).max(240),
        }),
    }))
        .min(4)
        .max(12),
});
exports.SessionContextPackSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0'),
    sessionId: exports.UUID,
    mode: exports.ModeEnum,
    resumeVersionId: exports.UUID.optional(),
    jobId: exports.UUID.optional(),
    targetRoleTitle: zod_1.z.string().min(2).max(140),
    roleFamily: zod_1.z.enum(['SWE_BACKEND', 'DEVOPS_CLOUD', 'PM', 'DATA']),
    seniority: exports.SeniorityEnum,
    interviewType: exports.InterviewTypeEnum,
    candidate: exports.CandidateSnapshotSchema,
    job: exports.JobSnapshotSchema,
    constraints: exports.SessionConstraintsSchema,
    rubric: exports.RubricSchema,
    createdAt: exports.ISODateTime,
});
exports.TranscriptSegmentSchema = zod_1.z.object({
    startMs: zod_1.z.number().int().min(0),
    endMs: zod_1.z.number().int().min(0),
    text: zod_1.z.string().min(1).max(2000),
    confidence: exports.Confidence01.optional(),
    speaker: zod_1.z.enum(['INTERVIEWER', 'CANDIDATE', 'UNKNOWN']).default('UNKNOWN'),
});
exports.InterviewTurnSchema = zod_1.z.object({
    id: exports.UUID,
    sessionId: exports.UUID,
    type: exports.TurnTypeEnum,
    createdAt: exports.ISODateTime,
    text: zod_1.z.string().min(1).max(12000),
    segments: zod_1.z.array(exports.TranscriptSegmentSchema).optional(),
    sttConfidence: exports.Confidence01.optional(),
});
exports.FrameworkEnum = zod_1.z.enum([
    'STAR',
    'PREP',
    'PYRAMID',
    'SYSTEM_DESIGN',
    'TRACE',
    'NONE',
]);
exports.FactCheckItemSchema = zod_1.z.object({
    claim: zod_1.z.string().min(3).max(240),
    status: zod_1.z.enum(['SUPPORTED', 'UNSUPPORTED', 'NEEDS_USER_CONFIRMATION']),
    suggestedFix: zod_1.z.string().min(3).max(240).optional(),
    evidence: zod_1.z.array(exports.EvidenceRefSchema).default([]),
});
exports.AnswerPlanVariantSchema = zod_1.z.object({
    targetSeconds: zod_1.z.number().int().min(15).max(300),
    structure: zod_1.z.array(zod_1.z.string().min(3).max(200)).min(2).max(10),
    keyPoints: zod_1.z.array(zod_1.z.string().min(3).max(200)).min(1).max(8),
    resumeAnchorsUsed: zod_1.z.array(exports.EvidenceRefSchema).default([]),
});
exports.CoachingOutputSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0'),
    questionCategory: zod_1.z.string().min(2).max(80),
    questionIntent: zod_1.z.string().min(5).max(200),
    recommendedFramework: exports.FrameworkEnum,
    frameworkSteps: zod_1.z.array(zod_1.z.string().min(5).max(200)).min(2).max(8),
    answerPlanVariants: zod_1.z.array(exports.AnswerPlanVariantSchema).min(1).max(3),
    factCheck: zod_1.z.object({
        items: zod_1.z.array(exports.FactCheckItemSchema).default([]),
        hasBlockingIssues: zod_1.z.boolean().default(false),
    }),
    personalization: zod_1.z.object({
        missingInfoQuestions: zod_1.z.array(zod_1.z.string().min(5).max(200)).default([]),
        suggestedImprovements: zod_1.z.array(zod_1.z.string().min(5).max(200)).default([]),
    }),
});
exports.DimensionScoreSchema = zod_1.z.object({
    dimensionKey: exports.RubricDimensionKeySchema,
    score: zod_1.z.number().int().min(1).max(5),
    rationale: zod_1.z.string().min(10).max(500),
    improvements: zod_1.z.array(zod_1.z.string().min(5).max(200)).default([]),
});
exports.ScoringOutputSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0'),
    dimensionScores: zod_1.z.array(exports.DimensionScoreSchema).min(1),
    overallScore: zod_1.z.number().min(1).max(5),
    summary: zod_1.z.string().min(10).max(1000),
    drills: zod_1.z.array(zod_1.z.string().min(5).max(200)).max(6).default([]),
    fillerWords: zod_1.z.array(zod_1.z.string().min(1).max(20)).default([]),
    strengths: zod_1.z.array(zod_1.z.string().min(5).max(200)).default([]),
    weaknesses: zod_1.z.array(zod_1.z.string().min(5).max(200)).default([]),
});
exports.QuestionPromptOutputSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0'),
    questions: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string().min(10).max(500),
        category: zod_1.z.string().min(2).max(80),
        goodAnswerSignals: zod_1.z.array(zod_1.z.string().min(5).max(200)).min(1).max(5),
    })).min(3).max(5),
});
//# sourceMappingURL=index.js.map