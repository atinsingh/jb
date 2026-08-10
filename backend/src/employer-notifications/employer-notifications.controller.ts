import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Request,
  Param,
  Query,
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
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerNotificationsService } from './employer-notifications.service';

@ApiTags('employer-notifications')
@ApiBearerAuth('JWT-auth')
@Controller('employer/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerNotificationsController {
  constructor(
    private readonly notificationsService: EmployerNotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List notifications with unread count' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: "Filter by type ('applicants'|'interviews'|'offers'|'ai'|'all')",
  })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async list(@Query('type') type: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.notificationsService.list(ownerId, type);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async readAll(@Request() req) {
    const ownerId = req.user._id.toString();
    return this.notificationsService.markAllRead(ownerId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markRead(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.notificationsService.markRead(ownerId, id);
  }
}
