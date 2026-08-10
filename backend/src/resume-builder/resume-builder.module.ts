import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ResumeBuilderController } from './resume-builder.controller';
import { ResumeBuilderService } from './resume-builder.service';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { ResumeVersion, ResumeVersionSchema } from '../schemas/resume-version.schema';
import { ShareLink, ShareLinkSchema } from '../schemas/share-link.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { LLMModule } from '../llm/llm.module';
import { ResumeModule } from '../resume/resume.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { bullQueueImports } from '../queue/queue.config';
import { isQueueEnabled, QUEUE_PDF } from '../queue/queue.constants';
import { ResumeBuilderPdfProcessor } from './resume-builder.pdf.processor';
import { HtmlSanitizerService } from '../ingestion/pipeline/html-sanitizer.service';
import { AtsModule } from '../ats/ats.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: User.name, schema: UserSchema },
      { name: ResumeVersion.name, schema: ResumeVersionSchema },
      { name: ShareLink.name, schema: ShareLinkSchema },
    ]),
    LLMModule,
    AtsModule,
    forwardRef(() => ResumeModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || 'your-secret-key';
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '7d';
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
    // Registers the 'pdf' Bull queue only when QUEUE_ENABLED=true; [] otherwise.
    ...bullQueueImports(QUEUE_PDF),
  ],
  controllers: [ResumeBuilderController],
  // The processor is only wired in when queues are enabled — without it, the
  // @Optional() @InjectQueue in the service resolves to undefined → inline path.
  providers: [
    ResumeBuilderService,
    // Dependency-free and stateless, so a local instance is fine — avoids
    // pulling in the whole IngestionModule (queues, cron) just to sanitize.
    HtmlSanitizerService,
    ...(isQueueEnabled() ? [ResumeBuilderPdfProcessor] : []),
  ],
  exports: [ResumeBuilderService],
})
export class ResumeBuilderModule { }

