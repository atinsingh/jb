import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { GreenhouseMonitorService } from './providers/greenhouse-monitor.service';
import { LeverMonitorService } from './providers/lever-monitor.service';
import { WorkdayMonitorService } from './providers/workday-monitor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('job-monitors')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_ADMIN')
@Controller('jobs/monitor')
export class MonitorController {
  private readonly logger = new Logger(MonitorController.name);

  constructor(
    private greenhouse: GreenhouseMonitorService,
    private lever: LeverMonitorService,
    private workday: WorkdayMonitorService,
  ) {}

  @Post('greenhouse/trigger')
  @ApiOperation({ summary: 'Trigger Greenhouse monitor once' })
  async triggerGreenhouse(@Body() body: { boards?: string[] }) {
    this.logger.log('Triggering Greenhouse monitor');
    const result = await this.greenhouse.run(body?.boards || []);
    return { message: 'Greenhouse monitor completed', result };
  }

  @Post('lever/trigger')
  @ApiOperation({ summary: 'Trigger Lever monitor once' })
  async triggerLever(@Body() body: { boards?: string[] }) {
    this.logger.log('Triggering Lever monitor');
    const result = await this.lever.run(body?.boards || []);
    return { message: 'Lever monitor completed', result };
  }

  @Post('workday/trigger')
  @ApiOperation({ summary: 'Trigger Workday monitor once' })
  async triggerWorkday(@Body() body: { sites?: string[] }) {
    this.logger.log('Triggering Workday monitor');
    const result = await this.workday.run(body?.sites || []);
    return { message: 'Workday monitor completed', result };
  }
}
