import {
  Body,
  Controller,
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
import { EmployerInterviewsService } from './employer-interviews.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { SubmitScorecardDto } from './dto/submit-scorecard.dto';

@ApiTags('employer-interviews')
@Controller('employer/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerInterviewsController {
  constructor(
    private readonly interviewsService: EmployerInterviewsService,
  ) {}

  @Get('')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List interviews for the employer' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'Interviews retrieved successfully' })
  async findAll(@Query('status') status: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const interviews = await this.interviewsService.findAll(ownerId, status);
    return {
      message: 'Interviews retrieved successfully',
      interviews,
      total: interviews.length,
    };
  }

  @Post('')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Schedule an interview' })
  @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
  async create(@Body() dto: ScheduleInterviewDto, @Request() req) {
    const ownerId = req.user._id.toString();
    const interview = await this.interviewsService.create(ownerId, dto);
    return {
      message: 'Interview scheduled successfully',
      interview,
    };
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get an interview by ID' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview retrieved successfully' })
  async findOne(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    const interview = await this.interviewsService.findOne(ownerId, id);
    return {
      message: 'Interview retrieved successfully',
      interview,
    };
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reschedule or update interview status' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const interview = await this.interviewsService.update(ownerId, id, dto);
    return {
      message: 'Interview updated successfully',
      interview,
    };
  }

  @Post(':id/scorecard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Submit a scorecard for an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 201, description: 'Scorecard submitted successfully' })
  async submitScorecard(
    @Param('id') id: string,
    @Body() dto: SubmitScorecardDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const interview = await this.interviewsService.submitScorecard(
      ownerId,
      id,
      dto,
    );
    return {
      message: 'Scorecard submitted successfully',
      interview,
    };
  }
}
