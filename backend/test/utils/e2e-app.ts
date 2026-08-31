import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import { signTestAccessToken } from './supabase-test-auth';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';

/**
 * Boot the real AppModule with the same global wiring `main.ts` applies.
 *
 * The pipe/prefix/filter setup is duplicated deliberately: `main.ts` does it
 * inside `bootstrap()`, which E2E can't call, and getting it wrong would make
 * the suite test a different app than production runs (validation errors would
 * surface as 500s instead of 400s, and every route would lose its /api prefix).
 */
export async function createE2EApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ rawBody: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.setGlobalPrefix('api', { exclude: ['health', 'health/readiness'] });

  await app.init();
  return app;
}

/** Drop the E2E database so each spec file starts from a known-empty state. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  await connection.dropDatabase();
}

export const api = (app: INestApplication) =>
  request(app.getHttpServer() as any);

/** Unique per call — E2E users must not collide across runs or spec files. */
export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}@e2e.jobocate.test`;

export interface TestUser {
  token: string;
  email: string;
  id: string;
}

/**
 * Create a user and return a bearer token for it.
 *
 * There is no registration endpoint any more — Supabase owns sign-up. So this
 * does what the migration does: writes the local User document (which owns
 * `role`, plan and Stripe state) and mints a matching access token.
 *
 * The token is signed with the per-run keypair from setup-e2e.ts and verified by
 * the real guard, so this exercises the production auth path rather than
 * bypassing it. The user is inserted explicitly rather than left to the guard's
 * lazy upsert because that path always creates ROLE_CANDIDATE, and the RBAC and
 * employer suites need ROLE_EMPLOYER.
 */
export async function registerUser(
  app: INestApplication,
  role: 'ROLE_CANDIDATE' | 'ROLE_EMPLOYER',
  namePrefix = 'e2e',
): Promise<TestUser> {
  const email = uniqueEmail(namePrefix);
  const supabaseUserId = randomUUID();

  const connection = app.get<Connection>(getConnectionToken());
  const inserted = await connection.collection('users').insertOne({
    supabaseUserId,
    email,
    name: `${namePrefix} tester`,
    role,
    provider: 'local',
    emailVerified: true,
    isActive: true,
    currentPlanType: 'FREE',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const token = await signTestAccessToken({
    sub: supabaseUserId,
    email,
    name: `${namePrefix} tester`,
  });

  return { token, email, id: inserted.insertedId.toString() };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
