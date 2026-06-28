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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserPreferences.name, schema: UserPreferencesSchema },
    ]),
    LoggerModule,
  ],
  controllers: [UsersController, UserPreferencesController],
  providers: [UsersService, EmailService, UserPreferencesService],
  exports: [UsersService, UserPreferencesService],
})
export class UsersModule {}
