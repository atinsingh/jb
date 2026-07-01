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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployerPipelineService } from './employer-pipeline.service';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { AddNoteDto } from './dto/add-note.dto';

@ApiTags('employer-applicants')
@ApiBearerAuth('JWT-auth')
@Controller('employer/applicants')
@UseGuards(JwtAuthGuard)
export class EmployerPipelineController {
  constructor(private readonly pipelineService: EmployerPipelineService) {}

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

  @Get(':id')
  @ApiOperation({ summary: 'Get an applicant by ID' })
  @ApiParam({ name: 'id', description: 'Applicant ID' })
  @ApiResponse({ status: 200, description: 'Applicant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Applicant not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.pipelineService.findOne(ownerId, id);
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
}
