import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplyRunnerService } from './apply-runner.service';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { LoggerModule } from '../common/logger/logger.module';
import { ApplyRunnerController } from './apply-runner.controller';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    forwardRef(() => ApplicationsModule),
    LoggerModule,
    MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
  ],
  controllers: [ApplyRunnerController],
  providers: [ApplyRunnerService],
  exports: [ApplyRunnerService],
})
export class ApplyRunnerModule {}
