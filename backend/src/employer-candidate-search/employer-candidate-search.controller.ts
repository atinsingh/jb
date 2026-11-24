import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerJobsService } from '../employer-jobs/employer-jobs.service';
import { EmployerCandidateSearchService } from './employer-candidate-search.service';

@ApiTags('employer-candidate-search')
@ApiBearerAuth('JWT-auth')
@Controller('employer/candidate-search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerCandidateSearchController {
  constructor(
    private readonly searchService: EmployerCandidateSearchService,
    private readonly jobs: EmployerJobsService,
  ) {}

  @Get('for-job/:jobId')
  @ApiOperation({ summary: 'Recommend identity-matched candidates for one posted job' })
  @ApiParam({ name: 'jobId' })
  forJob(@Param('jobId') jobId: string, @Request() req) {
    return this.jobs.findOne(req.user._id.toString(), jobId).then((job) =>
      this.searchService.recommend({ title: job.title, skills: job.skills }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Search identity-matched candidates and the roles they are targeting' })
  @ApiQuery({ name: 'q', required: false, description: 'Account name, skill, or headline' })
  @ApiQuery({ name: 'role', required: false, description: 'Targeted role' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      q,
      role,
      page: page === undefined ? undefined : Number(page),
      limit: limit === undefined ? undefined : Number(limit),
    });
  }
}
