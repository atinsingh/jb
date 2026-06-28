import { z } from 'zod';

// ==================== ENUMS ====================
export const UserRoleEnum = z.enum([
  'ROLE_CANDIDATE',
  'ROLE_EMPLOYER',
  'ROLE_AGENT',
  'ROLE_ADMIN',
]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const AuthProviderEnum = z.enum(['local', 'google', 'linkedin']);
export type AuthProvider = z.infer<typeof AuthProviderEnum>;

// ==================== REGISTER ====================
export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  role: UserRoleEnum.optional().default('ROLE_CANDIDATE'),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const RegisterResponseSchema = z.object({
  message: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: UserRoleEnum,
    provider: AuthProviderEnum,
  }),
  accessToken: z.string(),
});
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

// ==================== LOGIN ====================
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: UserRoleEnum,
    picture: z.string().optional(),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ==================== REFRESH TOKEN ====================
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // Optional since it can come from cookie
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
});
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;

// ==================== PASSWORD RESET ====================
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

// ==================== CHANGE PASSWORD ====================
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

// ==================== TOKEN PAYLOAD ====================
export const TokenPayloadSchema = z.object({
  sub: z.string(), // User ID
  email: z.string().email(),
  name: z.string(),
  role: UserRoleEnum,
  planId: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

