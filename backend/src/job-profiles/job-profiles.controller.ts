import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  Request,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobProfilesService } from './job-profiles.service';
import { CreateJobProfileDto } from './dto/create-job-profile.dto';
import { UpdateJobProfileDto } from './dto/update-job-profile.dto';
import { ActivateProfileDto } from './dto/activate-profile.dto';
import { ResumeParserService } from '../resume/resume-parser.service';
import { memoryStorage } from 'multer';
import { extname } from 'path';

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['.pdf', '.docx'];
  const ext = extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException('Invalid file type. Only PDF and DOCX allowed.'),
      false,
    );
  }
};

@ApiTags('job-profiles')
@Controller('job-profiles')
export class JobProfilesController {
  constructor(
    private jobProfilesService: JobProfilesService,
    private resumeParserService: ResumeParserService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new job profile',
    description: 'Creates a job profile for the authenticated user. The profile is created as inactive by default.',
  })
  @ApiBody({ type: CreateJobProfileDto })
  @ApiResponse({ status: 201, description: 'Job profile created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createProfile(@Request() req, @Body() createDto: CreateJobProfileDto) {
    const profile = await this.jobProfilesService.createProfile(
      req.user._id.toString(),
      createDto,
    );
    return {
      message: 'Job profile created successfully',
      profile,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all job profiles for current user',
    description: 'Returns all job profiles belonging to the authenticated user. No userId parameter needed - uses JWT token.',
  })
  @ApiResponse({ status: 200, description: 'Profiles retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserProfiles(@Request() req) {
    const profiles = await this.jobProfilesService.getUserProfiles(
      req.user._id.toString(),
    );
    return {
      message: 'Job profiles retrieved successfully',
      profiles,
      total: profiles.length,
    };
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get active job profiles for current user' })
  @ApiResponse({ status: 200, description: 'Active profiles retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActiveProfiles(@Request() req) {
    const profiles = await this.jobProfilesService.getActiveProfiles(
      req.user._id.toString(),
    );
    return {
      message: 'Active job profiles retrieved successfully',
      profiles,
      total: profiles.length,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get job profile statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfileStats(@Request() req) {
    const stats = await this.jobProfilesService.getProfileStats(
      req.user._id.toString(),
    );
    return {
      message: 'Profile statistics retrieved successfully',
      stats,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get job profile by ID',
    description: 'Returns a specific job profile. Only returns profiles belonging to the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Job profile ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfile(@Param('id') id: string, @Request() req) {
    const profile = await this.jobProfilesService.getProfile(
      id,
      req.user._id.toString(),
    );
    return {
      message: 'Job profile retrieved successfully',
      profile,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update job profile' })
  @ApiParam({ name: 'id', description: 'Job profile ID' })
  @ApiBody({ type: UpdateJobProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateProfile(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateJobProfileDto,
  ) {
    const profile = await this.jobProfilesService.updateProfile(
      id,
      req.user._id.toString(),
      updateDto,
    );
    return {
      message: 'Job profile updated successfully',
      profile,
    };
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Activate or deactivate job profile',
    description: 'Maximum 2 profiles can be active at a time. All inactive profiles are allowed.',
  })
  @ApiParam({ name: 'id', description: 'Job profile ID' })
  @ApiBody({ type: ActivateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile activation status updated' })
  @ApiResponse({ status: 400, description: 'Maximum 2 active profiles allowed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async activateProfile(
    @Param('id') id: string,
    @Request() req,
    @Body() activateDto: ActivateProfileDto,
  ) {
    const profile = await this.jobProfilesService.activateProfile(
      id,
      req.user._id.toString(),
      activateDto.active,
    );
    return {
      message: `Profile ${activateDto.active ? 'activated' : 'deactivated'} successfully`,
      profile,
    };
  }

  @Post(':id/resume')
  @UseGuards(JwtAuthGuard)
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
  @ApiOperation({
    summary: 'Upload resume for job profile and extract data',
    description: 'Uploads resume, extracts skills/experience/education, and marks profile as complete if all data is present',
  })
  @ApiParam({ name: 'id', description: 'Job profile ID' })
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
  @ApiResponse({ status: 200, description: 'Resume uploaded and profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or no file uploaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async uploadResume(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Parse resume
    const parseResult = await this.resumeParserService.parseResume(file);

    // Update profile with extracted data
    const profile = await this.jobProfilesService.updateProfileFromResume(
      id,
      req.user._id.toString(),
      {
        skills: parseResult.parsedData.skills,
        experience: parseResult.parsedData.experience,
        education: parseResult.parsedData.education,
        resumePath: parseResult.filePath,
        resumeText: parseResult.originalText,
      },
    );

    return {
      message: 'Resume uploaded and profile updated successfully',
      profile,
      parsedData: parseResult.parsedData,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete job profile' })
  @ApiParam({ name: 'id', description: 'Job profile ID' })
  @ApiResponse({ status: 200, description: 'Profile deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async deleteProfile(@Param('id') id: string, @Request() req) {
    await this.jobProfilesService.deleteProfile(id, req.user._id.toString());
    return {
      message: 'Job profile deleted successfully',
    };
  }
}

