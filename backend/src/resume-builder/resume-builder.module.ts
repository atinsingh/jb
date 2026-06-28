import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ResumeBuilderController } from './resume-builder.controller';
import { ResumeBuilderService } from './resume-builder.service';
import { Resume, ResumeSchema } from '../schemas/resume.schema';
import { ResumeVersion, ResumeVersionSchema } from '../schemas/resume-version.schema';
import { ShareLink, ShareLinkSchema } from '../schemas/share-link.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { AiServicesModule } from '../ai-services/ai-services.module';
import { ResumeModule } from '../resume/resume.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: User.name, schema: UserSchema },
      { name: ResumeVersion.name, schema: ResumeVersionSchema },
      { name: ShareLink.name, schema: ShareLinkSchema },
    ]),
    AiServicesModule,
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
  ],
  controllers: [ResumeBuilderController],
  providers: [ResumeBuilderService],
  exports: [ResumeBuilderService],
})
export class ResumeBuilderModule { }

