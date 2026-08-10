import {
  Controller,
  Get,
  Post,
  Delete,
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
import { EmployerDeveloperService } from './employer-developer.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('employer-developer')
@ApiBearerAuth('JWT-auth')
@Controller('employer/developer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerDeveloperController {
  constructor(
    private readonly developerService: EmployerDeveloperService,
  ) {}

  @Get('keys')
  @ApiOperation({ summary: 'List API keys' })
  @ApiResponse({ status: 200, description: 'Keys retrieved successfully' })
  async listKeys(@Request() req) {
    const ownerId = req.user._id.toString();
    const keys = await this.developerService.listKeys(ownerId);
    return { keys };
  }

  @Post('keys')
  @ApiOperation({ summary: 'Create an API key' })
  @ApiResponse({ status: 201, description: 'Key created successfully' })
  async createKey(@Body() dto: CreateApiKeyDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.developerService.createKey(ownerId, dto);
  }

  @Delete('keys/:id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'Key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteKey(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.developerService.deleteKey(ownerId, id);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhooks' })
  @ApiResponse({ status: 200, description: 'Webhooks retrieved successfully' })
  async listWebhooks(@Request() req) {
    const ownerId = req.user._id.toString();
    const webhooks = await this.developerService.listWebhooks(ownerId);
    return { webhooks };
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Create a webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  async createWebhook(@Body() dto: CreateWebhookDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.developerService.createWebhook(ownerId, dto);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Delete a webhook' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async deleteWebhook(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.developerService.deleteWebhook(ownerId, id);
  }
}
