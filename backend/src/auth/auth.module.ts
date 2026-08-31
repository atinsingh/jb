import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { SupabaseTokenService } from './supabase-token.service';
import { SupabaseUserSyncService } from './supabase-user-sync.service';
import { SupabaseAdminService } from './supabase-admin.service';
import { SupabaseWebhookController } from './supabase-webhook.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User, UserSchema } from '../schemas/user.schema';
import { LoggerModule } from '../common/logger/logger.module';

/**
 * @Global because `JwtAuthGuard` now has a real dependency.
 *
 * The guard is used by ~44 controllers spread across most feature modules, and
 * Nest resolves a guard's constructor dependencies from the module the guard is
 * *used* in. Before the Supabase swap the guard had no required dependencies, so
 * it worked anywhere; now it needs `SupabaseTokenService`. Exporting that
 * globally is the one-line alternative to adding an `AuthModule` import to every
 * feature module.
 *
 * `JwtModule` is gone from here: nothing in this module signs a token any more.
 * (`resume-builder` keeps its own JwtModule for short-lived PDF share links —
 * that is app-internal, not user auth.)
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    LoggerModule,
    ConfigModule,
  ],
  controllers: [AuthController, SupabaseWebhookController],
  providers: [SupabaseTokenService, SupabaseUserSyncService, SupabaseAdminService, JwtAuthGuard],
  exports: [SupabaseTokenService, SupabaseUserSyncService, SupabaseAdminService, JwtAuthGuard],
})
export class AuthModule {}
