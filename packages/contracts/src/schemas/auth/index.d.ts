import { z } from 'zod';
export declare const UserRoleEnum: z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>;
export type UserRole = z.infer<typeof UserRoleEnum>;
export declare const AuthProviderEnum: z.ZodEnum<["local", "google", "linkedin"]>;
export type AuthProvider = z.infer<typeof AuthProviderEnum>;
export declare const RegisterSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    password?: string;
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
}, {
    name?: string;
    email?: string;
    password?: string;
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
}>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export declare const RegisterResponseSchema: z.ZodObject<{
    message: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        role: z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>;
        provider: z.ZodEnum<["local", "google", "linkedin"]>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        email?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    }, {
        name?: string;
        email?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    }>;
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message?: string;
    user?: {
        name?: string;
        email?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    };
    accessToken?: string;
}, {
    message?: string;
    user?: {
        name?: string;
        email?: string;
        provider?: "local" | "google" | "linkedin";
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    };
    accessToken?: string;
}>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
}, {
    email?: string;
    password?: string;
}>;
export type LoginDto = z.infer<typeof LoginSchema>;
export declare const LoginResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>;
        picture: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        email?: string;
        picture?: string;
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    }, {
        name?: string;
        email?: string;
        picture?: string;
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    user?: {
        name?: string;
        email?: string;
        picture?: string;
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    };
    accessToken?: string;
}, {
    user?: {
        name?: string;
        email?: string;
        picture?: string;
        role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
        id?: string;
    };
    accessToken?: string;
}>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export declare const RefreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string;
}, {
    refreshToken?: string;
}>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
export declare const RefreshTokenResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accessToken?: string;
}, {
    accessToken?: string;
}>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export declare const ForgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email?: string;
}, {
    email?: string;
}>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export declare const ResetPasswordSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password?: string;
    token?: string;
    confirmPassword?: string;
}, {
    password?: string;
    token?: string;
    confirmPassword?: string;
}>, {
    password?: string;
    token?: string;
    confirmPassword?: string;
}, {
    password?: string;
    token?: string;
    confirmPassword?: string;
}>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export declare const ChangePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}>, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export declare const TokenPayloadSchema: z.ZodObject<{
    sub: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["ROLE_CANDIDATE", "ROLE_EMPLOYER", "ROLE_AGENT", "ROLE_ADMIN"]>;
    planId: z.ZodOptional<z.ZodString>;
    iat: z.ZodOptional<z.ZodNumber>;
    exp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    sub?: string;
    planId?: string;
    iat?: number;
    exp?: number;
}, {
    name?: string;
    email?: string;
    role?: "ROLE_CANDIDATE" | "ROLE_EMPLOYER" | "ROLE_AGENT" | "ROLE_ADMIN";
    sub?: string;
    planId?: string;
    iat?: number;
    exp?: number;
}>;
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;
