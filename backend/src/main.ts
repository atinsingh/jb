// MUST be first: populate process.env from .env before AppModule is evaluated,
// so module-load-time conditionals (e.g. QUEUE_ENABLED in queue.config.ts) see
// the right values. See src/load-env.ts.
import './load-env';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppLoggerService } from './common/logger/logger.service';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Initialize logger early (before app creation)
const earlyLogger = new AppLoggerService();
earlyLogger.setContext('Bootstrap');

// Load .env file before anything else (as a fallback)
earlyLogger.debug('Loading .env file...');
earlyLogger.debug(`process.cwd(): ${process.cwd()}`);

// Try multiple paths
const possibleEnvPaths = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'backend', '.env'),
  join(__dirname, '..', '.env'),
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error && result.parsed) {
    earlyLogger.log(`Loaded .env file from: ${envPath}`);
    earlyLogger.debug(`Environment variables loaded: ${Object.keys(result.parsed).length} variables`);
    // Log a few key variables to verify (without exposing secrets)
    if (result.parsed.GOOGLE_CLIENT_ID) {
      earlyLogger.debug(`GOOGLE_CLIENT_ID: ${result.parsed.GOOGLE_CLIENT_ID.substring(0, 20)}...`);
    } else {
      earlyLogger.warn('GOOGLE_CLIENT_ID: not found');
    }
    if (result.parsed.GOOGLE_CLIENT_SECRET) {
      earlyLogger.debug('GOOGLE_CLIENT_SECRET: ***');
    } else {
      earlyLogger.warn('GOOGLE_CLIENT_SECRET: not found');
    }
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  earlyLogger.warn(`Could not load .env file from any of these paths: ${possibleEnvPaths.join(', ')}`);
  earlyLogger.warn('Make sure .env file exists in the backend directory');
}

async function bootstrap() {
  try {
    earlyLogger.log('Starting application bootstrap...');
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: false, // Disable NestJS default logger, use our custom logger
      rawBody: true, // Preserve raw request body (req.rawBody) for Stripe webhook signature verification
    });
    earlyLogger.log('App module created successfully');

    // Serve locally-stored uploads (StorageService local driver) at /uploads/*.
    // No-op for the s3 driver, which returns absolute/presigned URLs instead.
    const storageLocalPath = process.env.STORAGE_LOCAL_PATH || './uploads';
    app.useStaticAssets(
      join(process.cwd(), storageLocalPath.replace(/^\.\//, '')),
      { prefix: '/uploads/' },
    );

  // Security response headers (HSTS, noSniff, frameguard, etc.). CSP is disabled
  // because this process serves a JSON API + Swagger UI, not first-party HTML.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Get logger service from app context
  const logger = app.get(AppLoggerService);
  logger.setContext('Application');

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter (inject logger)
  const httpExceptionFilter = app.get(HttpExceptionFilter);
  app.useGlobalFilters(httpExceptionFilter);

  // Global logging interceptor
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  // Global prefix (health endpoint excluded - handled separately)
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/readiness'],
  });

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('Jobocate API')
    .setDescription('Jobocate Backend API - Job matching and application management system')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('job-profiles', 'Job profile management endpoints')
    .addTag('resume', 'Resume management endpoints')
    .addTag('jobs', 'Job search and scraping endpoints')
    .addTag('applications', 'Job application management endpoints')
    .addTag('matching', 'Job matching and recommendations endpoints')
    .addTag('agents', 'Agent endpoints for managing candidate applications')
    .addTag('cover-letters', 'AI Cover Letter generation endpoints')
    .addTag('resume-builder', 'AI Resume Builder endpoints')
    .addTag('health', 'Health check endpoint')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const PORT = process.env.PORT || 8000;
  await app.listen(PORT, '0.0.0.0');
  
  logger.log(`🚀 Server running on port ${PORT}`);
  logger.log(`📚 Swagger documentation available at http://localhost:${PORT}/api/docs`);
  logger.log(`📊 AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  logger.log(`🔍 Job Scraping: ${process.env.JOB_SCRAPING_ENABLED !== 'false' ? 'Enabled' : 'Disabled'}`);
  logger.log(`🤖 Auto-Apply: ${process.env.AUTO_APPLICATION_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  logger.log(`📝 Logging Level: ${process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')}`);
  logger.log(`📁 Logs Directory: ${process.env.LOGS_DIR || join(process.cwd(), 'logs')}`);
  } catch (error) {
    earlyLogger.error('Error during bootstrap:', error);
    console.error('Bootstrap error:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  earlyLogger.error('Unhandled bootstrap error:', error);
  console.error('Unhandled error:', error);
  process.exit(1);
});
