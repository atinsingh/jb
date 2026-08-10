import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminIngestionService } from './admin-ingestion.service';
import { IngestionSource } from '../schemas/ingestion-source.schema';

/**
 * Admin ingestion-ops API (spec §12/§14). All routes are ROLE_ADMIN and served
 * under the global `api` prefix -> `/api/admin/ingestion/*`. Thin controller: all
 * data access + orchestration lives in AdminIngestionService.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_ADMIN')
@Controller('admin/ingestion')
export class AdminIngestionController {
  constructor(private readonly service: AdminIngestionService) {}

  // ---- sources ----
  @Get('sources')
  listSources() {
    return this.service.listSources();
  }

  @Post('sources')
  createSource(@Body() dto: Partial<IngestionSource>) {
    return this.service.createSource(dto);
  }

  @Patch('sources/:id')
  updateSource(@Param('id') id: string, @Body() dto: Partial<IngestionSource>) {
    return this.service.updateSource(id, dto);
  }

  @Delete('sources/:id')
  deleteSource(@Param('id') id: string) {
    return this.service.deleteSource(id);
  }

  @Patch('sources/:id/enable')
  setEnabled(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.service.setEnabled(id, enabled);
  }

  @Patch('sources/:id/emergency-stop')
  setEmergencyStop(@Param('id') id: string, @Body('stopped') stopped: boolean) {
    return this.service.setEmergencyStop(id, stopped);
  }

  @Post('sources/:id/run')
  runSource(@Param('id') id: string) {
    return this.service.runSource(id);
  }

  // ---- runs ----
  @Get('runs')
  listRuns(
    @Query('sourceId') sourceId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listRuns({
      sourceId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('runs/:id/cancel')
  cancelRun(@Param('id') id: string) {
    return this.service.cancelRun(id);
  }

  // ---- dead letters ----
  @Get('dead-letters')
  listDeadLetters(
    @Query('sourceId') sourceId?: string,
    @Query('reprocessed') reprocessed?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listDeadLetters({
      sourceId,
      reprocessed:
        reprocessed === undefined ? undefined : reprocessed === 'true',
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('dead-letters/:id/reprocess')
  reprocessDeadLetter(@Param('id') id: string) {
    return this.service.reprocessDeadLetter(id);
  }

  // ---- metrics ----
  @Get('metrics')
  getMetrics() {
    return this.service.getMetrics();
  }
}
