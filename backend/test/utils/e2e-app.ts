import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
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
 * Register a user and return its bearer token. Registration returns a token
 * directly, so this is one call rather than register-then-login.
 */
export async function registerUser(
  app: INestApplication,
  role: 'ROLE_CANDIDATE' | 'ROLE_EMPLOYER',
  namePrefix = 'e2e',
): Promise<TestUser> {
  const email = uniqueEmail(namePrefix);
  const res = await api(app)
    .post('/api/auth/register')
    .send({
      name: `${namePrefix} tester`,
      email,
      password: 'E2ePassw0rd!',
      role,
    })
    .expect(201);

  return { token: res.body.token, email, id: res.body.user?.id };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
