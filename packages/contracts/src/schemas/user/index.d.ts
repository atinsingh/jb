import { z } from 'zod';
export declare const ExperienceSchema: z.ZodObject<{
    title: z.ZodString;
    company: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodString>;
    current: z.ZodOptional<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
    achievements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    location?: string;
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
}, {
    location?: string;
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
    achievements?: string[];
}>;
export type Experience = z.infer<typeof ExperienceSchema>;
export declare const EducationSchema: z.ZodObject<{
    degree: z.ZodString;
    institution: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodString>;
    gpa: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    degree?: string;
    institution?: string;
    gpa?: string;
}, {
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    degree?: string;
    institution?: string;
    gpa?: string;
}>;
export type Education = z.infer<typeof EducationSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    picture: z.ZodOptional<z.ZodString>;
    provider: z.ZodDefault<z.ZodEnum<["local", "google", "linkedin"]>>;
    role: z.ZodDefault<z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>>;
    phone: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    experience: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        company: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        current: z.ZodOptional<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
        achievements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }, {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }>, "many">>;
    education: z.ZodOptional<z.ZodArray<z.ZodObject<{
        degree: z.ZodString;
        institution: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        gpa: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }, {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }>, "many">>;
    currentPlanType: z.ZodOptional<z.ZodEnum<["FREE", "PRO", "ELITE", "INTERVIEW"]>>;
    subscriptionStatus: z.ZodOptional<z.ZodEnum<["active", "canceled", "past_due", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"]>>;
    subscriptionId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    emailVerified: z.ZodDefault<z.ZodBoolean>;
    lastLogin: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    picture?: string;
    provider?: "local" | "google" | "linkedin";
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    phone?: string;
    location?: string;
    summary?: string;
    skills?: string[];
    experience?: {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }[];
    education?: {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }[];
    currentPlanType?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
    subscriptionId?: string;
    subscriptionStatus?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
    isActive?: boolean;
    lastLogin?: Date;
    emailVerified?: boolean;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}, {
    name?: string;
    email?: string;
    picture?: string;
    provider?: "local" | "google" | "linkedin";
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    phone?: string;
    location?: string;
    summary?: string;
    skills?: string[];
    experience?: {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }[];
    education?: {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }[];
    currentPlanType?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
    subscriptionId?: string;
    subscriptionStatus?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
    isActive?: boolean;
    lastLogin?: Date;
    emailVerified?: boolean;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const UserPublicProfileSchema: z.ZodObject<Pick<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    picture: z.ZodOptional<z.ZodString>;
    provider: z.ZodDefault<z.ZodEnum<["local", "google", "linkedin"]>>;
    role: z.ZodDefault<z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>>;
    phone: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    experience: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        company: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        current: z.ZodOptional<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
        achievements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }, {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }>, "many">>;
    education: z.ZodOptional<z.ZodArray<z.ZodObject<{
        degree: z.ZodString;
        institution: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        gpa: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }, {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }>, "many">>;
    currentPlanType: z.ZodOptional<z.ZodEnum<["FREE", "PRO", "ELITE", "INTERVIEW"]>>;
    subscriptionStatus: z.ZodOptional<z.ZodEnum<["active", "canceled", "past_due", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"]>>;
    subscriptionId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    emailVerified: z.ZodDefault<z.ZodBoolean>;
    lastLogin: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "name" | "email" | "picture" | "role" | "location" | "summary" | "skills" | "id">, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    picture?: string;
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    location?: string;
    summary?: string;
    skills?: string[];
    id?: string;
}, {
    name?: string;
    email?: string;
    picture?: string;
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    location?: string;
    summary?: string;
    skills?: string[];
    id?: string;
}>;
export type UserPublicProfile = z.infer<typeof UserPublicProfileSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    experience: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        company: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        current: z.ZodOptional<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
        achievements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }, {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }>, "many">>;
    education: z.ZodOptional<z.ZodArray<z.ZodObject<{
        degree: z.ZodString;
        institution: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        gpa: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }, {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    phone?: string;
    location?: string;
    summary?: string;
    skills?: string[];
    experience?: {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }[];
    education?: {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }[];
}, {
    name?: string;
    phone?: string;
    location?: string;
    summary?: string;
    skills?: string[];
    experience?: {
        location?: string;
        title?: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
    }[];
    education?: {
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        degree?: string;
        institution?: string;
        gpa?: string;
    }[];
}>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export declare const UserSettingsSchema: z.ZodObject<{
    emailNotifications: z.ZodObject<{
        jobAlerts: z.ZodDefault<z.ZodBoolean>;
        applicationUpdates: z.ZodDefault<z.ZodBoolean>;
        newsletter: z.ZodDefault<z.ZodBoolean>;
        marketing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    }, {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    }>;
    privacy: z.ZodObject<{
        profileVisible: z.ZodDefault<z.ZodBoolean>;
        showEmail: z.ZodDefault<z.ZodBoolean>;
        showPhone: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    }, {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    }>;
    preferences: z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>;
        language: z.ZodDefault<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    }, {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    emailNotifications?: {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    };
    privacy?: {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    };
    preferences?: {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    };
}, {
    emailNotifications?: {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    };
    privacy?: {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    };
    preferences?: {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    };
}>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export declare const UpdateUserSettingsSchema: z.ZodObject<{
    emailNotifications: z.ZodOptional<z.ZodObject<{
        jobAlerts: z.ZodDefault<z.ZodBoolean>;
        applicationUpdates: z.ZodDefault<z.ZodBoolean>;
        newsletter: z.ZodDefault<z.ZodBoolean>;
        marketing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    }, {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    }>>;
    privacy: z.ZodOptional<z.ZodObject<{
        profileVisible: z.ZodDefault<z.ZodBoolean>;
        showEmail: z.ZodDefault<z.ZodBoolean>;
        showPhone: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    }, {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    }>>;
    preferences: z.ZodOptional<z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark", "system"]>>;
        language: z.ZodDefault<z.ZodString>;
        timezone: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    }, {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    emailNotifications?: {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    };
    privacy?: {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    };
    preferences?: {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    };
}, {
    emailNotifications?: {
        jobAlerts?: boolean;
        applicationUpdates?: boolean;
        newsletter?: boolean;
        marketing?: boolean;
    };
    privacy?: {
        profileVisible?: boolean;
        showEmail?: boolean;
        showPhone?: boolean;
    };
    preferences?: {
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
    };
}>;
export type UpdateUserSettingsDto = z.infer<typeof UpdateUserSettingsSchema>;
export declare const AdminUpdateUserSchema: z.ZodObject<{
    role: z.ZodOptional<z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    emailVerified: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    isActive?: boolean;
    emailVerified?: boolean;
}, {
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    isActive?: boolean;
    emailVerified?: boolean;
}>;
export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;
export declare const UserListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "name", "email", "lastLogin"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    isActive?: boolean;
    search?: string;
    limit?: number;
    sortOrder?: "asc" | "desc";
    page?: number;
    sortBy?: "name" | "email" | "lastLogin" | "createdAt";
}, {
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    isActive?: boolean;
    search?: string;
    limit?: number;
    sortOrder?: "asc" | "desc";
    page?: number;
    sortBy?: "name" | "email" | "lastLogin" | "createdAt";
}>;
export type UserListQueryDto = z.infer<typeof UserListQuerySchema>;
export declare const UserListResponseSchema: z.ZodObject<{
    users: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        email: z.ZodString;
        picture: z.ZodOptional<z.ZodString>;
        provider: z.ZodDefault<z.ZodEnum<["local", "google", "linkedin"]>>;
        role: z.ZodDefault<z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>>;
        phone: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        summary: z.ZodOptional<z.ZodString>;
        skills: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        experience: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            company: z.ZodString;
            location: z.ZodOptional<z.ZodString>;
            startDate: z.ZodString;
            endDate: z.ZodOptional<z.ZodString>;
            current: z.ZodOptional<z.ZodBoolean>;
            description: z.ZodOptional<z.ZodString>;
            achievements: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            location?: string;
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
        }, {
            location?: string;
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
        }>, "many">>;
        education: z.ZodOptional<z.ZodArray<z.ZodObject<{
            degree: z.ZodString;
            institution: z.ZodString;
            location: z.ZodOptional<z.ZodString>;
            startDate: z.ZodString;
            endDate: z.ZodOptional<z.ZodString>;
            gpa: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            degree?: string;
            institution?: string;
            gpa?: string;
        }, {
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            degree?: string;
            institution?: string;
            gpa?: string;
        }>, "many">>;
        currentPlanType: z.ZodOptional<z.ZodEnum<["FREE", "PRO", "ELITE", "INTERVIEW"]>>;
        subscriptionStatus: z.ZodOptional<z.ZodEnum<["active", "canceled", "past_due", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"]>>;
        subscriptionId: z.ZodOptional<z.ZodString>;
        isActive: z.ZodDefault<z.ZodBoolean>;
        emailVerified: z.ZodDefault<z.ZodBoolean>;
        lastLogin: z.ZodOptional<z.ZodDate>;
        createdAt: z.ZodOptional<z.ZodDate>;
        updatedAt: z.ZodOptional<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        email?: string;
        picture?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        phone?: string;
        location?: string;
        summary?: string;
        skills?: string[];
        experience?: {
            location?: string;
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
        }[];
        education?: {
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            degree?: string;
            institution?: string;
            gpa?: string;
        }[];
        currentPlanType?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
        subscriptionId?: string;
        subscriptionStatus?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
        isActive?: boolean;
        lastLogin?: Date;
        emailVerified?: boolean;
        id?: string;
        createdAt?: Date;
        updatedAt?: Date;
    }, {
        name?: string;
        email?: string;
        picture?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        phone?: string;
        location?: string;
        summary?: string;
        skills?: string[];
        experience?: {
            location?: string;
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
        }[];
        education?: {
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            degree?: string;
            institution?: string;
            gpa?: string;
        }[];
        currentPlanType?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
        subscriptionId?: string;
        subscriptionStatus?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
        isActive?: boolean;
        lastLogin?: Date;
        emailVerified?: boolean;
        id?: string;
        createdAt?: Date;
        updatedAt?: Date;
    }>, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
    }, {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    users?: {
        name?: string;
        email?: string;
        picture?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        phone?: string;
        location?: string;
        summary?: string;
        skills?: string[];
        experience?: {
            location?: string;
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
        }[];
        education?: {
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            degree?: string;
            institution?: string;
            gpa?: string;
        }[];
        currentPlanType?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
        subscriptionId?: string;
        subscriptionStatus?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
        isActive?: boolean;
        lastLogin?: Date;
        emailVerified?: boolean;
        id?: string;
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    pagination?: {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
    };
}, {
    users?: {
        name?: string;
        email?: string;
        picture?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        phone?: string;
        location?: string;
        summary?: string;
        skills?: string[];
        experience?: {
            location?: string;
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            current?: boolean;
            description?: string;
            achievements?: string[];
        }[];
        education?: {
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            degree?: string;
            institution?: string;
            gpa?: string;
        }[];
        currentPlanType?: "FREE" | "PRO" | "ELITE" | "INTERVIEW";
        subscriptionId?: string;
        subscriptionStatus?: "active" | "canceled" | "past_due" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
        isActive?: boolean;
        lastLogin?: Date;
        emailVerified?: boolean;
        id?: string;
        createdAt?: Date;
        updatedAt?: Date;
    }[];
    pagination?: {
        limit?: number;
        total?: number;
        page?: number;
        totalPages?: number;
    };
}>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
