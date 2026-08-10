import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerJobsService } from './employer-jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@ApiTags('employer-jobs')
@Controller('employer/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerJobsController {
  constructor(private readonly employerJobsService: EmployerJobsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a job posting' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  async create(@Body() dto: CreateJobDto, @Request() req) {
    const ownerId = req.user._id.toString();
    const job = await this.employerJobsService.create(ownerId, dto);
    return {
      message: 'Job created successfully',
      job,
    };
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List own job postings' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  async findAll(@Query('status') status: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const jobs = await this.employerJobsService.findAll(ownerId, status);
    return {
      message: 'Jobs retrieved successfully',
      jobs,
      total: jobs.length,
    };
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a job posting by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async findOne(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const job = await this.employerJobsService.findOne(ownerId, id);
    return {
      message: 'Job retrieved successfully',
      job,
    };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a job posting' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const job = await this.employerJobsService.update(ownerId, id, dto);
    return {
      message: 'Job updated successfully',
      job,
    };
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update job status' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const job = await this.employerJobsService.updateStatus(
      ownerId,
      id,
      dto.status,
    );
    return {
      message: 'Job status updated successfully',
      job,
    };
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a job posting' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async remove(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    await this.employerJobsService.remove(ownerId, id);
    return {
      message: 'Job deleted successfully',
    };
  }
}
