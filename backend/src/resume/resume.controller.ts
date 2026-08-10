import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeService } from './resume.service';
import { ResumeParserService } from './resume-parser.service';
import { memoryStorage } from 'multer';
import { extname } from 'path';

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['.pdf', '.docx'];
  const ext = extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Invalid file type. Only PDF and DOCX allowed.'), false);
  }
};

@ApiTags('resume')
@Controller('resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  private readonly logger = new Logger(ResumeController.name);

  constructor(
    private resumeService: ResumeService,
    private resumeParserService: ResumeParserService,
  ) {}

  @Post('parse')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter,
    }),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload and parse resume file (PDF or DOCX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
          description: 'Resume file (PDF or DOCX, max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Resume parsed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or no file uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async parseResume(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    this.logger.log(`📄 Parsing resume for user: ${req.user?.email || 'unknown'}`);
    this.logger.debug(`File: ${file.originalname}, Size: ${file.size} bytes`);

    const result = await this.resumeParserService.parseResume(
      file,
      req.user._id.toString(),
    );
    this.logger.log(`✅ Resume parsed successfully for user: ${req.user?.email || 'unknown'}`);

    // Only backfill MISSING profile fields from the resume. Never overwrite the
    // account's login email (identity) — doing so can collide with another
    // user's email (E11000) and silently change how the user signs in.
    const updates: Record<string, string> = {};
    if (!req.user.name && result.parsedData.name) updates.name = result.parsedData.name;
    if (!req.user.phone && result.parsedData.phone) updates.phone = result.parsedData.phone;

    let user = req.user;
    if (Object.keys(updates).length) {
      try {
        user = await this.resumeService.updateUserProfile(req.user._id.toString(), updates);
      } catch (e) {
        this.logger.warn(`Profile backfill skipped: ${e?.message || e}`);
      }
    }

    return {
      message: 'Resume parsed successfully',
      parsedData: result.parsedData,
      user,
    };
  }

  @Get('data')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user basic resume data' })
  @ApiResponse({ status: 200, description: 'Resume data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getResumeData(@Request() req) {
    const user = await this.resumeService.getUserResumeData(req.user._id.toString());
    return {
      message: 'Resume data retrieved successfully',
      name: user.name,
      email: user.email,
      phone: user.phone,
      note: 'For detailed profile data (skills, experience, education), use GET /api/job-profiles',
    };
  }
}

