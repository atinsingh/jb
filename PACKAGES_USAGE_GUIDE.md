# Packages Folder Usage Guide

## Overview

The `packages/` folder contains shared code that can be used across multiple parts of the monorepo. Currently, it contains the `@jobocate/contracts` package, which provides shared TypeScript types and Zod validation schemas.

## Structure

```
packages/
└── contracts/
    ├── package.json          # Package configuration
    ├── tsconfig.json         # TypeScript configuration
    └── src/
        ├── index.ts          # Main entry point (exports all schemas)
        ├── schemas/          # Zod validation schemas
        │   ├── auth/         # Authentication schemas
        │   ├── billing/      # Billing & subscription schemas
        │   └── user/         # User profile schemas
        ├── types/            # TypeScript type definitions
        │   └── api.ts        # Common API types (errors, pagination, etc.)
        ├── dto/              # Data Transfer Objects (currently empty)
        └── api-client/       # API client utilities (currently empty)
```

## What is `@jobocate/contracts`?

The `@jobocate/contracts` package is a **shared type and schema library** that provides:

1. **Zod Validation Schemas** - Runtime validation for API requests/responses
2. **TypeScript Types** - Type-safe interfaces derived from Zod schemas
3. **Shared Constants** - Feature keys, enums, etc.

## How It's Used

### 1. **Monorepo Package Setup**

The package is configured as a local workspace dependency:

**Root `package.json`:**
```json
{
  "workspaces": ["packages/*", "backend", "frontend"]
}
```

**Backend `package.json`:**
```json
{
  "dependencies": {
    "@jobocate/contracts": "file:../packages/contracts"
  }
}
```

### 2. **Building the Package**

The contracts package uses `tsup` to build:

```bash
cd packages/contracts
npm run build    # Build once
npm run dev      # Build in watch mode
```

This generates:
- `dist/index.js` - CommonJS build
- `dist/index.mjs` - ES Module build
- `dist/index.d.ts` - TypeScript definitions

### 3. **Using in Backend**

**Import schemas and types:**
```typescript
// Import from the package
import { 
  FeatureKeys, 
  UserSchema, 
  LoginDto,
  RegisterDto 
} from '@jobocate/contracts';

// Use in your code
const feature = FeatureKeys.AI_RESUME_OPTIMIZATION;

// Validate data with Zod
const userData = UserSchema.parse(apiResponse);

// Use TypeScript types
function createUser(data: RegisterDto) {
  // Type-safe!
}
```

**Example from the codebase:**
```typescript
// backend/src/entitlement/__tests__/entitlement.service.spec.ts
import { FeatureKeys } from '@jobocate/contracts';

describe('EntitlementService', () => {
  it('should check feature access', () => {
    const feature = FeatureKeys.AI_RESUME_OPTIMIZATION;
    // Use the feature key...
  });
});
```

### 4. **Available Exports**

From `packages/contracts/src/index.ts`:

```typescript
// Schemas
export * from './schemas/auth';      // LoginDto, RegisterDto, TokenPayload, etc.
export * from './schemas/billing';   // SubscriptionPlan, FeatureKeys, etc.
export * from './schemas/user';      // UserSchema, UpdateUserDto, etc.

// Types
export * from './types/api';         // ApiError, Pagination, etc.

// Zod
export { z } from 'zod';             // Re-export Zod for convenience
```

### 5. **What's Included**

#### **Auth Schemas** (`schemas/auth/index.ts`)
- `RegisterSchema` / `RegisterDto`
- `LoginSchema` / `LoginDto`
- `TokenPayloadSchema` / `TokenPayload`
- `UserRoleEnum`, `AuthProviderEnum`
- Password reset schemas

#### **Billing Schemas** (`schemas/billing/index.ts`)
- `SubscriptionPlanSchema`
- `UserSubscriptionSchema`
- `FeatureKeys` - Constants for feature flags
- `PlanTypeEnum`, `SubscriptionStatusEnum`
- Entitlement checking schemas

#### **User Schemas** (`schemas/user/index.ts`)
- `UserSchema` / `User`
- `UpdateUserSchema` / `UpdateUserDto`
- `UserSettingsSchema` / `UserSettings`
- `ExperienceSchema`, `EducationSchema`

#### **API Types** (`types/api.ts`)
- `ApiErrorSchema` / `ApiError`
- `PaginationSchema` / `Pagination`
- `HealthCheckSchema` / `HealthCheck`

## Benefits

1. **Type Safety** - Shared types ensure frontend and backend stay in sync
2. **Runtime Validation** - Zod schemas validate data at runtime
3. **Single Source of Truth** - Define schemas once, use everywhere
4. **Monorepo Integration** - Easy to share code between packages

## Development Workflow

1. **Edit schemas** in `packages/contracts/src/`
2. **Build the package**: `cd packages/contracts && npm run build`
3. **Use in backend/frontend**: Import from `@jobocate/contracts`
4. **Watch mode**: `npm run dev` in contracts folder for auto-rebuild

## Future Usage

The `dto/` and `api-client/` folders are currently empty but could contain:
- **DTOs**: Additional data transfer objects
- **API Client**: Shared API client code for frontend/backend communication

## Example: Adding a New Schema

1. **Create schema** in `packages/contracts/src/schemas/`:
```typescript
// packages/contracts/src/schemas/job/index.ts
import { z } from 'zod';

export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  // ...
});
export type Job = z.infer<typeof JobSchema>;
```

2. **Export it** in `packages/contracts/src/index.ts`:
```typescript
export * from './schemas/job';
```

3. **Build**: `cd packages/contracts && npm run build`

4. **Use in backend**:
```typescript
import { JobSchema, Job } from '@jobocate/contracts';
```

## Current Usage in Codebase

The contracts package is currently used in:
- `backend/src/entitlement/__tests__/` - Using `FeatureKeys` for testing

It's set up to be used more broadly for:
- API request/response validation
- Shared type definitions
- Feature flag constants
- User and billing schemas

