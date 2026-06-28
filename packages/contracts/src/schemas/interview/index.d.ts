import { z } from 'zod';
export declare const ISODateTime: z.ZodString;
export declare const UUID: z.ZodString;
export declare const ModeEnum: z.ZodEnum<["PRACTICE", "CONSENT", "LIVE_NOTES"]>;
export declare const TurnTypeEnum: z.ZodEnum<["QUESTION", "ANSWER", "COACHING", "SYSTEM"]>;
export declare const SeniorityEnum: z.ZodEnum<["INTERN", "JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL", "MANAGER"]>;
export declare const InterviewTypeEnum: z.ZodEnum<["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "CODING", "CASE", "MIXED"]>;
export declare const Confidence01: z.ZodNumber;
export declare const EvidenceRefSchema: z.ZodObject<{
    source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
    sourceId: z.ZodOptional<z.ZodString>;
    quote: z.ZodOptional<z.ZodString>;
    section: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
    sourceId?: string;
    quote?: string;
    section?: string;
}, {
    source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
    sourceId?: string;
    quote?: string;
    section?: string;
}>;
export declare const CandidateSnapshotSchema: z.ZodObject<{
    headline: z.ZodString;
    summaryBullets: z.ZodArray<z.ZodString, "many">;
    coreSkills: z.ZodArray<z.ZodString, "many">;
    domainTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    achievements: z.ZodDefault<z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        evidence: z.ZodArray<z.ZodObject<{
            source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
            sourceId: z.ZodOptional<z.ZodString>;
            quote: z.ZodOptional<z.ZodString>;
            section: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }, {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }>, "many">;
        confidence: z.ZodNumber;
        needsUserConfirmation: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        text?: string;
        evidence?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
        confidence?: number;
        needsUserConfirmation?: boolean;
    }, {
        text?: string;
        evidence?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
        confidence?: number;
        needsUserConfirmation?: boolean;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    headline?: string;
    summaryBullets?: string[];
    coreSkills?: string[];
    domainTags?: string[];
    achievements?: {
        text?: string;
        evidence?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
        confidence?: number;
        needsUserConfirmation?: boolean;
    }[];
}, {
    headline?: string;
    summaryBullets?: string[];
    coreSkills?: string[];
    domainTags?: string[];
    achievements?: {
        text?: string;
        evidence?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
        confidence?: number;
        needsUserConfirmation?: boolean;
    }[];
}>;
export declare const JobSnapshotSchema: z.ZodObject<{
    jobTitle: z.ZodString;
    companyName: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    responsibilities: z.ZodArray<z.ZodString, "many">;
    requiredSkills: z.ZodArray<z.ZodString, "many">;
    preferredSkills: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    jobTitle?: string;
    companyName?: string;
    location?: string;
    responsibilities?: string[];
    requiredSkills?: string[];
    preferredSkills?: string[];
    keywords?: string[];
}, {
    jobTitle?: string;
    companyName?: string;
    location?: string;
    responsibilities?: string[];
    requiredSkills?: string[];
    preferredSkills?: string[];
    keywords?: string[];
}>;
export declare const SessionConstraintsSchema: z.ZodObject<{
    answerTimeSecondsOptions: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    style: z.ZodDefault<z.ZodEnum<["CONCISE", "BALANCED", "DETAILED"]>>;
    language: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    answerTimeSecondsOptions?: number[];
    style?: "CONCISE" | "BALANCED" | "DETAILED";
    language?: string;
}, {
    answerTimeSecondsOptions?: number[];
    style?: "CONCISE" | "BALANCED" | "DETAILED";
    language?: string;
}>;
export declare const RubricDimensionKeySchema: z.ZodString;
export declare const RubricSchema: z.ZodObject<{
    rubricId: z.ZodString;
    roleFamily: z.ZodEnum<["SWE_BACKEND", "DEVOPS_CLOUD", "PM", "DATA"]>;
    interviewType: z.ZodEnum<["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "CODING", "CASE", "MIXED"]>;
    seniority: z.ZodEnum<["INTERN", "JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL", "MANAGER"]>;
    dimensions: z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        weight: z.ZodNumber;
        anchors: z.ZodObject<{
            score1: z.ZodString;
            score3: z.ZodString;
            score5: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            score1?: string;
            score3?: string;
            score5?: string;
        }, {
            score1?: string;
            score3?: string;
            score5?: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        key?: string;
        name?: string;
        description?: string;
        weight?: number;
        anchors?: {
            score1?: string;
            score3?: string;
            score5?: string;
        };
    }, {
        key?: string;
        name?: string;
        description?: string;
        weight?: number;
        anchors?: {
            score1?: string;
            score3?: string;
            score5?: string;
        };
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rubricId?: string;
    roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
    interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
    seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
    dimensions?: {
        key?: string;
        name?: string;
        description?: string;
        weight?: number;
        anchors?: {
            score1?: string;
            score3?: string;
            score5?: string;
        };
    }[];
}, {
    rubricId?: string;
    roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
    interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
    seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
    dimensions?: {
        key?: string;
        name?: string;
        description?: string;
        weight?: number;
        anchors?: {
            score1?: string;
            score3?: string;
            score5?: string;
        };
    }[];
}>;
export declare const SessionContextPackSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    sessionId: z.ZodString;
    mode: z.ZodEnum<["PRACTICE", "CONSENT", "LIVE_NOTES"]>;
    resumeVersionId: z.ZodOptional<z.ZodString>;
    jobId: z.ZodOptional<z.ZodString>;
    targetRoleTitle: z.ZodString;
    roleFamily: z.ZodEnum<["SWE_BACKEND", "DEVOPS_CLOUD", "PM", "DATA"]>;
    seniority: z.ZodEnum<["INTERN", "JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL", "MANAGER"]>;
    interviewType: z.ZodEnum<["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "CODING", "CASE", "MIXED"]>;
    candidate: z.ZodObject<{
        headline: z.ZodString;
        summaryBullets: z.ZodArray<z.ZodString, "many">;
        coreSkills: z.ZodArray<z.ZodString, "many">;
        domainTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        achievements: z.ZodDefault<z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            evidence: z.ZodArray<z.ZodObject<{
                source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
                sourceId: z.ZodOptional<z.ZodString>;
                quote: z.ZodOptional<z.ZodString>;
                section: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }, {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }>, "many">;
            confidence: z.ZodNumber;
            needsUserConfirmation: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            text?: string;
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            confidence?: number;
            needsUserConfirmation?: boolean;
        }, {
            text?: string;
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            confidence?: number;
            needsUserConfirmation?: boolean;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        headline?: string;
        summaryBullets?: string[];
        coreSkills?: string[];
        domainTags?: string[];
        achievements?: {
            text?: string;
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            confidence?: number;
            needsUserConfirmation?: boolean;
        }[];
    }, {
        headline?: string;
        summaryBullets?: string[];
        coreSkills?: string[];
        domainTags?: string[];
        achievements?: {
            text?: string;
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            confidence?: number;
            needsUserConfirmation?: boolean;
        }[];
    }>;
    job: z.ZodObject<{
        jobTitle: z.ZodString;
        companyName: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        responsibilities: z.ZodArray<z.ZodString, "many">;
        requiredSkills: z.ZodArray<z.ZodString, "many">;
        preferredSkills: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        keywords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        jobTitle?: string;
        companyName?: string;
        location?: string;
        responsibilities?: string[];
        requiredSkills?: string[];
        preferredSkills?: string[];
        keywords?: string[];
    }, {
        jobTitle?: string;
        companyName?: string;
        location?: string;
        responsibilities?: string[];
        requiredSkills?: string[];
        preferredSkills?: string[];
        keywords?: string[];
    }>;
    constraints: z.ZodObject<{
        answerTimeSecondsOptions: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        style: z.ZodDefault<z.ZodEnum<["CONCISE", "BALANCED", "DETAILED"]>>;
        language: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        answerTimeSecondsOptions?: number[];
        style?: "CONCISE" | "BALANCED" | "DETAILED";
        language?: string;
    }, {
        answerTimeSecondsOptions?: number[];
        style?: "CONCISE" | "BALANCED" | "DETAILED";
        language?: string;
    }>;
    rubric: z.ZodObject<{
        rubricId: z.ZodString;
        roleFamily: z.ZodEnum<["SWE_BACKEND", "DEVOPS_CLOUD", "PM", "DATA"]>;
        interviewType: z.ZodEnum<["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "CODING", "CASE", "MIXED"]>;
        seniority: z.ZodEnum<["INTERN", "JUNIOR", "MID", "SENIOR", "STAFF", "PRINCIPAL", "MANAGER"]>;
        dimensions: z.ZodArray<z.ZodObject<{
            key: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            weight: z.ZodNumber;
            anchors: z.ZodObject<{
                score1: z.ZodString;
                score3: z.ZodString;
                score5: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                score1?: string;
                score3?: string;
                score5?: string;
            }, {
                score1?: string;
                score3?: string;
                score5?: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            key?: string;
            name?: string;
            description?: string;
            weight?: number;
            anchors?: {
                score1?: string;
                score3?: string;
                score5?: string;
            };
        }, {
            key?: string;
            name?: string;
            description?: string;
            weight?: number;
            anchors?: {
                score1?: string;
                score3?: string;
                score5?: string;
            };
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        rubricId?: string;
        roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
        interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
        seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
        dimensions?: {
            key?: string;
            name?: string;
            description?: string;
            weight?: number;
            anchors?: {
                score1?: string;
                score3?: string;
                score5?: string;
            };
        }[];
    }, {
        rubricId?: string;
        roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
        interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
        seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
        dimensions?: {
            key?: string;
            name?: string;
            description?: string;
            weight?: number;
            anchors?: {
                score1?: string;
                score3?: string;
                score5?: string;
            };
        }[];
    }>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
    interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
    seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
    schemaVersion?: "1.0";
    sessionId?: string;
    mode?: "PRACTICE" | "CONSENT" | "LIVE_NOTES";
    resumeVersionId?: string;
    jobId?: string;
    targetRoleTitle?: string;
    candidate?: {
        headline?: string;
        summaryBullets?: string[];
        coreSkills?: string[];
        domainTags?: string[];
        achievements?: {
            text?: string;
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            confidence?: number;
            needsUserConfirmation?: boolean;
        }[];
    };
    job?: {
        jobTitle?: string;
        companyName?: string;
        location?: string;
        responsibilities?: string[];
        requiredSkills?: string[];
        preferredSkills?: string[];
        keywords?: string[];
    };
    constraints?: {
        answerTimeSecondsOptions?: number[];
        style?: "CONCISE" | "BALANCED" | "DETAILED";
        language?: string;
    };
    rubric?: {
        rubricId?: string;
        roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
        interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
        seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
        dimensions?: {
            key?: string;
            name?: string;
            description?: string;
            weight?: number;
            anchors?: {
                score1?: string;
                score3?: string;
                score5?: string;
            };
        }[];
    };
    createdAt?: string;
}, {
    roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
    interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
    seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
    schemaVersion?: "1.0";
    sessionId?: string;
    mode?: "PRACTICE" | "CONSENT" | "LIVE_NOTES";
    resumeVersionId?: string;
    jobId?: string;
    targetRoleTitle?: string;
    candidate?: {
        headline?: string;
        summaryBullets?: string[];
        coreSkills?: string[];
        domainTags?: string[];
        achievements?: {
            text?: string;
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            confidence?: number;
            needsUserConfirmation?: boolean;
        }[];
    };
    job?: {
        jobTitle?: string;
        companyName?: string;
        location?: string;
        responsibilities?: string[];
        requiredSkills?: string[];
        preferredSkills?: string[];
        keywords?: string[];
    };
    constraints?: {
        answerTimeSecondsOptions?: number[];
        style?: "CONCISE" | "BALANCED" | "DETAILED";
        language?: string;
    };
    rubric?: {
        rubricId?: string;
        roleFamily?: "SWE_BACKEND" | "DEVOPS_CLOUD" | "PM" | "DATA";
        interviewType?: "BEHAVIORAL" | "TECHNICAL" | "SYSTEM_DESIGN" | "CODING" | "CASE" | "MIXED";
        seniority?: "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF" | "PRINCIPAL" | "MANAGER";
        dimensions?: {
            key?: string;
            name?: string;
            description?: string;
            weight?: number;
            anchors?: {
                score1?: string;
                score3?: string;
                score5?: string;
            };
        }[];
    };
    createdAt?: string;
}>;
export declare const TranscriptSegmentSchema: z.ZodObject<{
    startMs: z.ZodNumber;
    endMs: z.ZodNumber;
    text: z.ZodString;
    confidence: z.ZodOptional<z.ZodNumber>;
    speaker: z.ZodDefault<z.ZodEnum<["INTERVIEWER", "CANDIDATE", "UNKNOWN"]>>;
}, "strip", z.ZodTypeAny, {
    text?: string;
    confidence?: number;
    startMs?: number;
    endMs?: number;
    speaker?: "INTERVIEWER" | "CANDIDATE" | "UNKNOWN";
}, {
    text?: string;
    confidence?: number;
    startMs?: number;
    endMs?: number;
    speaker?: "INTERVIEWER" | "CANDIDATE" | "UNKNOWN";
}>;
export declare const InterviewTurnSchema: z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    type: z.ZodEnum<["QUESTION", "ANSWER", "COACHING", "SYSTEM"]>;
    createdAt: z.ZodString;
    text: z.ZodString;
    segments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        startMs: z.ZodNumber;
        endMs: z.ZodNumber;
        text: z.ZodString;
        confidence: z.ZodOptional<z.ZodNumber>;
        speaker: z.ZodDefault<z.ZodEnum<["INTERVIEWER", "CANDIDATE", "UNKNOWN"]>>;
    }, "strip", z.ZodTypeAny, {
        text?: string;
        confidence?: number;
        startMs?: number;
        endMs?: number;
        speaker?: "INTERVIEWER" | "CANDIDATE" | "UNKNOWN";
    }, {
        text?: string;
        confidence?: number;
        startMs?: number;
        endMs?: number;
        speaker?: "INTERVIEWER" | "CANDIDATE" | "UNKNOWN";
    }>, "many">>;
    sttConfidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "QUESTION" | "ANSWER" | "COACHING" | "SYSTEM";
    text?: string;
    sessionId?: string;
    createdAt?: string;
    id?: string;
    segments?: {
        text?: string;
        confidence?: number;
        startMs?: number;
        endMs?: number;
        speaker?: "INTERVIEWER" | "CANDIDATE" | "UNKNOWN";
    }[];
    sttConfidence?: number;
}, {
    type?: "QUESTION" | "ANSWER" | "COACHING" | "SYSTEM";
    text?: string;
    sessionId?: string;
    createdAt?: string;
    id?: string;
    segments?: {
        text?: string;
        confidence?: number;
        startMs?: number;
        endMs?: number;
        speaker?: "INTERVIEWER" | "CANDIDATE" | "UNKNOWN";
    }[];
    sttConfidence?: number;
}>;
export declare const FrameworkEnum: z.ZodEnum<["STAR", "PREP", "PYRAMID", "SYSTEM_DESIGN", "TRACE", "NONE"]>;
export declare const FactCheckItemSchema: z.ZodObject<{
    claim: z.ZodString;
    status: z.ZodEnum<["SUPPORTED", "UNSUPPORTED", "NEEDS_USER_CONFIRMATION"]>;
    suggestedFix: z.ZodOptional<z.ZodString>;
    evidence: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
        sourceId: z.ZodOptional<z.ZodString>;
        quote: z.ZodOptional<z.ZodString>;
        section: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }, {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
    evidence?: {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }[];
    claim?: string;
    suggestedFix?: string;
}, {
    status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
    evidence?: {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }[];
    claim?: string;
    suggestedFix?: string;
}>;
export declare const AnswerPlanVariantSchema: z.ZodObject<{
    targetSeconds: z.ZodNumber;
    structure: z.ZodArray<z.ZodString, "many">;
    keyPoints: z.ZodArray<z.ZodString, "many">;
    resumeAnchorsUsed: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
        sourceId: z.ZodOptional<z.ZodString>;
        quote: z.ZodOptional<z.ZodString>;
        section: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }, {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    targetSeconds?: number;
    structure?: string[];
    keyPoints?: string[];
    resumeAnchorsUsed?: {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }[];
}, {
    targetSeconds?: number;
    structure?: string[];
    keyPoints?: string[];
    resumeAnchorsUsed?: {
        source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
        sourceId?: string;
        quote?: string;
        section?: string;
    }[];
}>;
export declare const CoachingOutputSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    questionCategory: z.ZodString;
    questionIntent: z.ZodString;
    recommendedFramework: z.ZodEnum<["STAR", "PREP", "PYRAMID", "SYSTEM_DESIGN", "TRACE", "NONE"]>;
    frameworkSteps: z.ZodArray<z.ZodString, "many">;
    answerPlanVariants: z.ZodArray<z.ZodObject<{
        targetSeconds: z.ZodNumber;
        structure: z.ZodArray<z.ZodString, "many">;
        keyPoints: z.ZodArray<z.ZodString, "many">;
        resumeAnchorsUsed: z.ZodDefault<z.ZodArray<z.ZodObject<{
            source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
            sourceId: z.ZodOptional<z.ZodString>;
            quote: z.ZodOptional<z.ZodString>;
            section: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }, {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        targetSeconds?: number;
        structure?: string[];
        keyPoints?: string[];
        resumeAnchorsUsed?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
    }, {
        targetSeconds?: number;
        structure?: string[];
        keyPoints?: string[];
        resumeAnchorsUsed?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
    }>, "many">;
    factCheck: z.ZodObject<{
        items: z.ZodDefault<z.ZodArray<z.ZodObject<{
            claim: z.ZodString;
            status: z.ZodEnum<["SUPPORTED", "UNSUPPORTED", "NEEDS_USER_CONFIRMATION"]>;
            suggestedFix: z.ZodOptional<z.ZodString>;
            evidence: z.ZodDefault<z.ZodArray<z.ZodObject<{
                source: z.ZodEnum<["RESUME", "PROFILE", "JOB_DESCRIPTION", "USER_NOTE"]>;
                sourceId: z.ZodOptional<z.ZodString>;
                quote: z.ZodOptional<z.ZodString>;
                section: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }, {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            claim?: string;
            suggestedFix?: string;
        }, {
            status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            claim?: string;
            suggestedFix?: string;
        }>, "many">>;
        hasBlockingIssues: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        items?: {
            status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            claim?: string;
            suggestedFix?: string;
        }[];
        hasBlockingIssues?: boolean;
    }, {
        items?: {
            status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            claim?: string;
            suggestedFix?: string;
        }[];
        hasBlockingIssues?: boolean;
    }>;
    personalization: z.ZodObject<{
        missingInfoQuestions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        suggestedImprovements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        missingInfoQuestions?: string[];
        suggestedImprovements?: string[];
    }, {
        missingInfoQuestions?: string[];
        suggestedImprovements?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    schemaVersion?: "1.0";
    questionCategory?: string;
    questionIntent?: string;
    recommendedFramework?: "SYSTEM_DESIGN" | "STAR" | "PREP" | "PYRAMID" | "TRACE" | "NONE";
    frameworkSteps?: string[];
    answerPlanVariants?: {
        targetSeconds?: number;
        structure?: string[];
        keyPoints?: string[];
        resumeAnchorsUsed?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
    }[];
    factCheck?: {
        items?: {
            status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            claim?: string;
            suggestedFix?: string;
        }[];
        hasBlockingIssues?: boolean;
    };
    personalization?: {
        missingInfoQuestions?: string[];
        suggestedImprovements?: string[];
    };
}, {
    schemaVersion?: "1.0";
    questionCategory?: string;
    questionIntent?: string;
    recommendedFramework?: "SYSTEM_DESIGN" | "STAR" | "PREP" | "PYRAMID" | "TRACE" | "NONE";
    frameworkSteps?: string[];
    answerPlanVariants?: {
        targetSeconds?: number;
        structure?: string[];
        keyPoints?: string[];
        resumeAnchorsUsed?: {
            source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
            sourceId?: string;
            quote?: string;
            section?: string;
        }[];
    }[];
    factCheck?: {
        items?: {
            status?: "SUPPORTED" | "UNSUPPORTED" | "NEEDS_USER_CONFIRMATION";
            evidence?: {
                source?: "RESUME" | "PROFILE" | "JOB_DESCRIPTION" | "USER_NOTE";
                sourceId?: string;
                quote?: string;
                section?: string;
            }[];
            claim?: string;
            suggestedFix?: string;
        }[];
        hasBlockingIssues?: boolean;
    };
    personalization?: {
        missingInfoQuestions?: string[];
        suggestedImprovements?: string[];
    };
}>;
export declare const DimensionScoreSchema: z.ZodObject<{
    dimensionKey: z.ZodString;
    score: z.ZodNumber;
    rationale: z.ZodString;
    improvements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    dimensionKey?: string;
    score?: number;
    rationale?: string;
    improvements?: string[];
}, {
    dimensionKey?: string;
    score?: number;
    rationale?: string;
    improvements?: string[];
}>;
export declare const ScoringOutputSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    dimensionScores: z.ZodArray<z.ZodObject<{
        dimensionKey: z.ZodString;
        score: z.ZodNumber;
        rationale: z.ZodString;
        improvements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        dimensionKey?: string;
        score?: number;
        rationale?: string;
        improvements?: string[];
    }, {
        dimensionKey?: string;
        score?: number;
        rationale?: string;
        improvements?: string[];
    }>, "many">;
    overallScore: z.ZodNumber;
    summary: z.ZodString;
    drills: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    fillerWords: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    strengths: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    weaknesses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    schemaVersion?: "1.0";
    dimensionScores?: {
        dimensionKey?: string;
        score?: number;
        rationale?: string;
        improvements?: string[];
    }[];
    overallScore?: number;
    summary?: string;
    drills?: string[];
    fillerWords?: string[];
    strengths?: string[];
    weaknesses?: string[];
}, {
    schemaVersion?: "1.0";
    dimensionScores?: {
        dimensionKey?: string;
        score?: number;
        rationale?: string;
        improvements?: string[];
    }[];
    overallScore?: number;
    summary?: string;
    drills?: string[];
    fillerWords?: string[];
    strengths?: string[];
    weaknesses?: string[];
}>;
export declare const QuestionPromptOutputSchema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1.0">;
    questions: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        category: z.ZodString;
        goodAnswerSignals: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        text?: string;
        category?: string;
        goodAnswerSignals?: string[];
    }, {
        text?: string;
        category?: string;
        goodAnswerSignals?: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    schemaVersion?: "1.0";
    questions?: {
        text?: string;
        category?: string;
        goodAnswerSignals?: string[];
    }[];
}, {
    schemaVersion?: "1.0";
    questions?: {
        text?: string;
        category?: string;
        goodAnswerSignals?: string[];
    }[];
}>;
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
