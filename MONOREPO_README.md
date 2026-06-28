# Jobocate Monorepo

A modern SaaS platform for job seekers with AI-powered features, configurable subscription plans, and comprehensive entitlement management.

## 📁 Project Structure

```
jobocate/
├── backend/              # NestJS Backend API
│   ├── src/
│   │   ├── auth/         # Authentication module
│   │   ├── billing/      # Stripe billing & subscriptions
│   │   ├── entitlement/  # Feature entitlements & usage tracking
│   │   ├── schemas/      # Mongoose schemas
│   │   ├── scripts/      # Database seed scripts
│   │   └── ...           # Other existing modules
│   └── package.json
├── frontend/             # Next.js Frontend (Pages Router)
│   ├── src/
│   │   ├── pages/        # Next.js pages
│   │   ├── components/   # React components
│   │   └── ...
│   └── package.json
├── packages/
│   └── contracts/        # Shared TypeScript types & Zod schemas
├── package.json          # Root package.json
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── tsconfig.base.json    # Shared TypeScript configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB (local or cloud)
- Stripe account (for billing features)

### Setup

1. **Install pnpm** (if not installed):
   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   
   Backend (`backend/.env`):
   ```bash
   cp backend/env.example backend/.env
   # Edit .env with your values
   ```

4. **Start MongoDB** (if running locally):
   ```bash
   # Using Docker
   docker-compose up -d mongodb
   
   # Or using local MongoDB
   mongod
   ```

5. **Seed the database** (optional but recommended):
   ```bash
   pnpm db:seed
   ```

6. **Start development servers**:
   ```bash
   # Start both frontend and backend
   pnpm dev
   
   # Or start individually
   pnpm dev:backend
   pnpm dev:frontend
   ```

### Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation (Swagger)**: http://localhost:8000/api/docs

## 🔐 Authentication

The platform supports multiple authentication methods:

- **Email/Password**: Standard registration and login
- **Google OAuth**: Sign in with Google
- **LinkedIn OAuth**: Sign in with LinkedIn (optional)

### JWT Token Flow

1. User authenticates → receives access token (15 min) + refresh token (7 days)
2. Access token stored in httpOnly cookie
3. Refresh token used to obtain new access token when expired

## 💳 Billing & Subscriptions

### Subscription Plans

| Plan | Price (Monthly) | Key Features |
|------|-----------------|--------------|
| Free | $0 | 5 applications/month, 1 resume |
| Pro | $29 | AI features, 50 applications/month |
| Elite | $99 | Human agent, unlimited applications |
| Interview | $149 | Dedicated coach, interview prep |

### Stripe Integration

1. **Setup Stripe**:
   - Create products and prices in Stripe Dashboard
   - Add Stripe keys to `.env`
   - Configure webhook endpoint: `POST /api/billing/webhook`

2. **Webhook Events Handled**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## 🔒 Entitlements System

Features are gated based on user's subscription plan using the entitlement system.

### Entitlement Types

1. **Boolean**: Feature is on/off
   ```typescript
   @RequireEntitlement({ featureKey: 'ai_resume_optimization' })
   ```

2. **Limit**: Usage-based with monthly reset
   ```typescript
   @RequireEntitlement({ 
     featureKey: 'job_applications_per_month',
     incrementUsage: true 
   })
   ```

3. **Tier**: Hierarchical access levels
   ```typescript
   @RequireEntitlement({ 
     featureKey: 'agent_type',
     requiredValue: 'human' 
   })
   ```

### Using Entitlements in Controllers

```typescript
import { RequireEntitlement, EntitlementGuard } from '../entitlement';

@Controller('ai')
@UseGuards(JwtAuthGuard, EntitlementGuard)
export class AIController {
  
  @Post('optimize-resume')
  @RequireEntitlement({ featureKey: 'ai_resume_optimization' })
  async optimizeResume() {
    // Only accessible to PRO+ plans
  }

  @Post('apply')
  @RequireEntitlement({ 
    featureKey: 'job_applications_per_month',
    incrementUsage: true 
  })
  async applyToJob() {
    // Checks limit and increments usage
  }
}
```

## 🛠 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services in development mode |
| `pnpm dev:backend` | Start backend only |
| `pnpm dev:frontend` | Start frontend only |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm db:seed` | Seed database with plans and entitlements |
| `pnpm typecheck` | Run TypeScript type checking |

### Adding New Entitlements

1. Add feature key constant in `backend/src/scripts/seed.ts`
2. Add entitlement config for each plan
3. Run `pnpm db:seed` to update database
4. Use `@RequireEntitlement()` decorator in controllers

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Billing
- `GET /api/billing/plans` - List subscription plans
- `GET /api/billing/subscription` - Get user subscription
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/portal` - Create billing portal session
- `POST /api/billing/cancel` - Cancel subscription
- `POST /api/billing/webhook` - Stripe webhook handler

### Entitlements
- `GET /api/entitlements` - Get user's entitlements
- `GET /api/entitlements/check/:featureKey` - Check specific entitlement
- `GET /api/entitlements/plans/:planType` - Get plan entitlements

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run backend tests only
cd backend && pnpm test

# Run with coverage
pnpm test:cov
```

## 🚀 Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Environment Variables

See `backend/env.example` for all required environment variables.

## 📝 License

MIT
