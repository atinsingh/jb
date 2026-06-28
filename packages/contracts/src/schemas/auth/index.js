"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPayloadSchema = exports.ChangePasswordSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.RefreshTokenResponseSchema = exports.RefreshTokenSchema = exports.LoginResponseSchema = exports.LoginSchema = exports.RegisterResponseSchema = exports.RegisterSchema = exports.AuthProviderEnum = exports.UserRoleEnum = void 0;
const zod_1 = require("zod");
exports.UserRoleEnum = zod_1.z.enum([
    'ROLE_CANDIDATE',
    'ROLE_EMPLOYER',
    'ROLE_AGENT',
    'ROLE_ADMIN',
]);
exports.AuthProviderEnum = zod_1.z.enum(['local', 'google', 'linkedin']);
exports.RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    role: exports.UserRoleEnum.optional().default('ROLE_CANDIDATE'),
});
exports.RegisterResponseSchema = zod_1.z.object({
    message: zod_1.z.string(),
    user: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string().email(),
        role: exports.UserRoleEnum,
        provider: exports.AuthProviderEnum,
    }),
    accessToken: zod_1.z.string(),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.LoginResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    user: zod_1.z.object({
        id: zod_1.z.string(),
        email: zod_1.z.string().email(),
        name: zod_1.z.string(),
        role: exports.UserRoleEnum,
        picture: zod_1.z.string().optional(),
    }),
});
exports.RefreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().optional(),
});
exports.RefreshTokenResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
});
exports.ForgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string(),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.ChangePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, 'Current password is required'),
    newPassword: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});
exports.TokenPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    role: exports.UserRoleEnum,
    planId: zod_1.z.string().optional(),
    iat: zod_1.z.number().optional(),
    exp: zod_1.z.number().optional(),
});
//# sourceMappingURL=index.js.map