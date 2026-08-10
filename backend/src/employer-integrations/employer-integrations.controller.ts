import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Request,
  Param,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerIntegrationsService } from './employer-integrations.service';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@ApiTags('employer-integrations')
@ApiBearerAuth('JWT-auth')
@Controller('employer/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerIntegrationsController {
  constructor(
    private readonly integrationsService: EmployerIntegrationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List integrations for the workspace' })
  @ApiResponse({ status: 200, description: 'Integrations retrieved successfully' })
  async list(@Request() req) {
    const ownerId = req.user._id.toString();
    const integrations = await this.integrationsService.list(ownerId);
    return { integrations };
  }

  @Post(':integrationId/connect')
  @ApiOperation({ summary: 'Connect an integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 201, description: 'Integration connected successfully' })
  async connect(
    @Param('integrationId') integrationId: string,
    @Body() dto: ConnectIntegrationDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.integrationsService.connect(ownerId, integrationId, dto);
  }

  @Post(':integrationId/disconnect')
  @ApiOperation({ summary: 'Disconnect an integration' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 201, description: 'Integration disconnected successfully' })
  async disconnect(
    @Param('integrationId') integrationId: string,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.integrationsService.disconnect(ownerId, integrationId);
  }

  @Patch(':integrationId')
  @ApiOperation({ summary: 'Update integration settings' })
  @ApiParam({ name: 'integrationId', description: 'Integration ID' })
  @ApiResponse({ status: 200, description: 'Integration updated successfully' })
  async update(
    @Param('integrationId') integrationId: string,
    @Body() dto: UpdateIntegrationDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.integrationsService.update(ownerId, integrationId, dto);
  }
}
