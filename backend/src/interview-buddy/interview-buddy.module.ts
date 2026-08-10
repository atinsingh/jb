import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewBuddyController } from './interview-buddy.controller';
import { InterviewBuddyService } from './interview-buddy.service';
import { Application, ApplicationSchema } from '../schemas/application.schema';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { Job, JobSchema } from '../schemas/job.schema';
import { InterviewSession, InterviewSessionSchema } from '../schemas/interview-session.schema';
import { InterviewTurn, InterviewTurnSchema } from '../schemas/interview-turn.schema';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: Job.name, schema: JobSchema },
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      { name: InterviewTurn.name, schema: InterviewTurnSchema },
    ]),
    LLMModule,
  ],
  controllers: [InterviewBuddyController],
  providers: [InterviewBuddyService],
  exports: [InterviewBuddyService],
})
export class InterviewBuddyModule {}
