import { z } from 'zod';
import { UserRoleEnum, AuthProviderEnum } from '../auth';
import { PlanTypeEnum, SubscriptionStatusEnum } from '../billing';

// ==================== EXPERIENCE ====================
export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
});
export type Experience = z.infer<typeof ExperienceSchema>;

// ==================== EDUCATION ====================
export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  description: z.string().optional(),
});
export type Education = z.infer<typeof EducationSchema>;

// ==================== USER ====================
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  picture: z.string().url().optional(),
  provider: AuthProviderEnum.default('local'),
  role: UserRoleEnum.default('ROLE_CANDIDATE'),
  
  // Profile info
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(ExperienceSchema).optional(),
  education: z.array(EducationSchema).optional(),
  
  // Subscription info (denormalized for quick access)
  currentPlanType: PlanTypeEnum.optional(),
  subscriptionStatus: SubscriptionStatusEnum.optional(),
  subscriptionId: z.string().optional(),
  
  // Status
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  lastLogin: z.date().optional(),
  
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type User = z.infer<typeof UserSchema>;

// ==================== USER PUBLIC PROFILE ====================
export const UserPublicProfileSchema = UserSchema.pick({
  id: true,
  name: true,
  email: true,
  picture: true,
  role: true,
  location: true,
  summary: true,
  skills: true,
});
export type UserPublicProfile = z.infer<typeof UserPublicProfileSchema>;

// ==================== UPDATE USER ====================
export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(ExperienceSchema).optional(),
  education: z.array(EducationSchema).optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

// ==================== USER SETTINGS ====================
export const UserSettingsSchema = z.object({
  emailNotifications: z.object({
    jobAlerts: z.boolean().default(true),
    applicationUpdates: z.boolean().default(true),
    newsletter: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }),
  privacy: z.object({
    profileVisible: z.boolean().default(true),
    showEmail: z.boolean().default(false),
    showPhone: z.boolean().default(false),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
  }),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UpdateUserSettingsSchema = UserSettingsSchema.partial();
export type UpdateUserSettingsDto = z.infer<typeof UpdateUserSettingsSchema>;

// ==================== ADMIN USER MANAGEMENT ====================
export const AdminUpdateUserSchema = z.object({
  role: UserRoleEnum.optional(),
  isActive: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});
export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;

export const UserListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: UserRoleEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastLogin']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type UserListQueryDto = z.infer<typeof UserListQuerySchema>;

export const UserListResponseSchema = z.object({
  users: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

