import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import {
  HarnessModelAlias,
  HarnessModelAliasSchema,
} from './schemas/harness-model-alias.schema';
import { ModelAliasService } from './model-alias.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HarnessModelAlias.name, schema: HarnessModelAliasSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [ModelAliasService],
  exports: [ModelAliasService],
})
export class ModelAliasModule {}
