import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JobsService } from '../jobs/jobs.service';

@ApiTags('admin-jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_ADMIN')
@Controller('admin/jobs')
export class AdminJobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async list(
    @Query('lifecycle') lifecycle?: string,
    @Query('moderationStatus') moderationStatus?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobsService.adminList({ lifecycle, moderationStatus, q, page, limit });
  }

  @Patch(':id/moderation')
  async setModeration(
    @Param('id') id: string,
    @Body('moderationStatus') moderationStatus: string,
  ) {
    return this.jobsService.adminSetModeration(id, moderationStatus);
  }

  @Patch(':id/lifecycle')
  async setLifecycle(@Param('id') id: string, @Body('lifecycle') lifecycle: string) {
    return this.jobsService.adminSetLifecycle(id, lifecycle);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.jobsService.adminDeactivate(id);
  }
}
