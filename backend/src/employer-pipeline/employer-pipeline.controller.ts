import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Request,
  Param,
  Query,
  Body,
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
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerPipelineService } from './employer-pipeline.service';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { EmployerResumeAssessmentService } from './employer-resume-assessment.service';

const resumePreviewFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const ext = extname(file.originalname).toLowerCase();
  if (ext === '.pdf' || ext === '.docx') {
    cb(null, true);
    return;
  }
  cb(new BadRequestException('Invalid file type. Only PDF and DOCX allowed.'), false);
};

@ApiTags('employer-applicants')
@ApiBearerAuth('JWT-auth')
@Controller('employer/applicants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerPipelineController {
  constructor(
    private readonly pipelineService: EmployerPipelineService,
    private readonly resumeAssessmentService: EmployerResumeAssessmentService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get applicant counts per stage for the funnel' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async stats(@Query('jobId') jobId: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.pipelineService.stats(ownerId, jobId);
  }

  @Get()
  @ApiOperation({ summary: 'List applicants in the pipeline' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filter by stage' })
  @ApiResponse({ status: 200, description: 'Applicants retrieved successfully' })
  async list(
    @Query('jobId') jobId: string,
    @Query('stage') stage: string,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.pipelineService.list(ownerId, jobId, stage);
  }

  @Get('resume-assessment/budget')
  @ApiOperation({ summary: 'Get the employer ATS budget status' })
  @ApiResponse({ status: 200, description: 'ATS budget status retrieved' })
  async assessmentBudget(@Request() req) {
    const ownerId = req.user._id.toString();
    return this.resumeAssessmentService.budgetStatus(ownerId);
  }

  @Post('resume-assessment/acquire')
  @ApiOperation({ summary: 'Prepare the employer ATS sandbox for this page' })
  async acquireAssessmentSandbox(@Body() body: { leaseId?: string }, @Request() req) {
    if (!body?.leaseId || typeof body.leaseId !== 'string') {
      throw new BadRequestException('leaseId is required');
    }
    return this.resumeAssessmentService.acquireSandbox(req.user._id.toString(), body.leaseId);
  }

  @Post('resume-assessment/release')
  @ApiOperation({
    summary: 'Destroy the employer ATS sandbox when the recruiter leaves the page',
  })
  @ApiResponse({ status: 201, description: 'Sandbox released' })
  async releaseAssessmentSandbox(@Body() body: { leaseId?: string }, @Request() req) {
    if (!body?.leaseId || typeof body.leaseId !== 'string') {
      throw new BadRequestException('leaseId is required');
    }
    const ownerId = req.user._id.toString();
    return this.resumeAssessmentService.releaseSandbox(ownerId, body.leaseId);
  }

  @Get('resume-assessment/preview')
  @ApiOperation({ summary: 'Restore the last uploaded ATS preview for a job' })
  async savedPreview(@Query('jobId') jobId: string, @Request() req) {
    if (!jobId) throw new BadRequestException('jobId is required');
    return this.resumeAssessmentService.getSavedPreview(req.user._id.toString(), jobId);
  }

  @Post('resume-assessment/preview')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: resumePreviewFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Score an uploaded résumé against a job without creating an applicant',
  })
  @ApiQuery({ name: 'jobId', required: true, description: 'Employer job ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Ad-hoc ATS preview completed' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async previewResume(
    @Query('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!jobId) throw new BadRequestException('jobId is required');
    const ownerId = req.user._id.toString();
    return file
      ? this.resumeAssessmentService.previewFromUpload(ownerId, jobId, file)
      : this.resumeAssessmentService.rerunSavedPreview(ownerId, jobId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an applicant by ID' })
  @ApiParam({ name: 'id', description: 'Applicant ID' })
  @ApiResponse({ status: 200, description: 'Applicant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Applicant not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const applicant = await this.pipelineService.findOne(ownerId, id);
    return this.resumeAssessmentService.markStaleIfNeeded(ownerId, applicant);
  }

  @Post()
  @ApiOperation({ summary: 'Create an applicant (sourcing/seed)' })
  @ApiResponse({ status: 201, description: 'Applicant created successfully' })
  async create(@Body() dto: CreateApplicantDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.pipelineService.create(ownerId, dto);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update an applicant stage' })
  @ApiParam({ name: 'id', description: 'Applicant ID' })
  @ApiResponse({ status: 200, description: 'Stage updated successfully' })
  @ApiResponse({ status: 404, description: 'Applicant not found' })
  async updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateStageDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.pipelineService.updateStage(ownerId, id, dto.stage);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to an applicant' })
  @ApiParam({ name: 'id', description: 'Applicant ID' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  @ApiResponse({ status: 404, description: 'Applicant not found' })
  async addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.pipelineService.addNote(ownerId, id, dto.text);
  }

  @Post(':id/resume-assessment')
  @ApiOperation({ summary: 'Assess the exact resume submitted by an applicant' })
  @ApiParam({ name: 'id', description: 'Applicant ID' })
  @ApiResponse({ status: 201, description: 'Assessment completed or partially completed' })
  @ApiResponse({ status: 404, description: 'Applicant not found' })
  async assessResume(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.resumeAssessmentService.assess(ownerId, id);
  }
}
