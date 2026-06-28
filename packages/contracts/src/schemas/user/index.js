"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserListResponseSchema = exports.UserListQuerySchema = exports.AdminUpdateUserSchema = exports.UpdateUserSettingsSchema = exports.UserSettingsSchema = exports.UpdateUserSchema = exports.UserPublicProfileSchema = exports.UserSchema = exports.EducationSchema = exports.ExperienceSchema = void 0;
const zod_1 = require("zod");
const auth_1 = require("../auth");
const billing_1 = require("../billing");
exports.ExperienceSchema = zod_1.z.object({
    title: zod_1.z.string(),
    company: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string().optional(),
    current: zod_1.z.boolean().optional(),
    description: zod_1.z.string().optional(),
    achievements: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.EducationSchema = zod_1.z.object({
    degree: zod_1.z.string(),
    institution: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string().optional(),
    gpa: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().email(),
    picture: zod_1.z.string().url().optional(),
    provider: auth_1.AuthProviderEnum.default('local'),
    role: auth_1.UserRoleEnum.default('ROLE_CANDIDATE'),
    phone: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    experience: zod_1.z.array(exports.ExperienceSchema).optional(),
    education: zod_1.z.array(exports.EducationSchema).optional(),
    currentPlanType: billing_1.PlanTypeEnum.optional(),
    subscriptionStatus: billing_1.SubscriptionStatusEnum.optional(),
    subscriptionId: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().default(true),
    emailVerified: zod_1.z.boolean().default(false),
    lastLogin: zod_1.z.date().optional(),
    createdAt: zod_1.z.date().optional(),
    updatedAt: zod_1.z.date().optional(),
});
exports.UserPublicProfileSchema = exports.UserSchema.pick({
    id: true,
    name: true,
    email: true,
    picture: true,
    role: true,
    location: true,
    summary: true,
    skills: true,
});
exports.UpdateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    phone: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    experience: zod_1.z.array(exports.ExperienceSchema).optional(),
    education: zod_1.z.array(exports.EducationSchema).optional(),
});
exports.UserSettingsSchema = zod_1.z.object({
    emailNotifications: zod_1.z.object({
        jobAlerts: zod_1.z.boolean().default(true),
        applicationUpdates: zod_1.z.boolean().default(true),
        newsletter: zod_1.z.boolean().default(false),
        marketing: zod_1.z.boolean().default(false),
    }),
    privacy: zod_1.z.object({
        profileVisible: zod_1.z.boolean().default(true),
        showEmail: zod_1.z.boolean().default(false),
        showPhone: zod_1.z.boolean().default(false),
    }),
    preferences: zod_1.z.object({
        theme: zod_1.z.enum(['light', 'dark', 'system']).default('system'),
        language: zod_1.z.string().default('en'),
        timezone: zod_1.z.string().default('UTC'),
    }),
});
exports.UpdateUserSettingsSchema = exports.UserSettingsSchema.partial();
exports.AdminUpdateUserSchema = zod_1.z.object({
    role: auth_1.UserRoleEnum.optional(),
    isActive: zod_1.z.boolean().optional(),
    emailVerified: zod_1.z.boolean().optional(),
});
exports.UserListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().min(1).default(1),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    role: auth_1.UserRoleEnum.optional(),
    isActive: zod_1.z.coerce.boolean().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'name', 'email', 'lastLogin']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
exports.UserListResponseSchema = zod_1.z.object({
    users: zod_1.z.array(exports.UserSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
});
//# sourceMappingURL=index.js.map