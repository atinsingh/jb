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
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_CANDIDATE', 'ROLE_ADMIN')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List candidate notifications with unread count' })
  @ApiQuery({
    name: 'type',
    required: false,
    description:
      "Filter by type ('applications'|'auto'|'matches'|'messages'|'all')",
  })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async list(@Query('type') type: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.notificationsService.list(userId, type);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async readAll(@Request() req) {
    const userId = req.user._id.toString();
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markRead(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    return this.notificationsService.markRead(userId, id);
  }
}
