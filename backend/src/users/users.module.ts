import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../schemas/user.schema';
import { UserPreferences, UserPreferencesSchema } from '../schemas/user-preferences.schema';
import { EmailService } from '../common/services/email.service';
import { LoggerModule } from '../common/logger/logger.module';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesController } from './user-preferences.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserPreferences.name, schema: UserPreferencesSchema },
    ]),
    LoggerModule,
    // Supplies BillingService for GET /users/invoices. BillingModule does not
    // import this module back, so there is no cycle.
    BillingModule,
  ],
  controllers: [UsersController, UserPreferencesController],
  providers: [UsersService, EmailService, UserPreferencesService],
  exports: [UsersService, UserPreferencesService],
})
export class UsersModule {}
