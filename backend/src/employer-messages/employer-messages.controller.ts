import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
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
import { EmployerMessagesService } from './employer-messages.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('employer-messages')
@ApiBearerAuth('JWT-auth')
@Controller('employer/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerMessagesController {
  constructor(private readonly messagesService: EmployerMessagesService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations for the owner' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved' })
  async listConversations(@Request() req) {
    const ownerId = req.user._id.toString();
    const conversations =
      await this.messagesService.listConversations(ownerId);
    return { conversations };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const conversation = await this.messagesService.createConversation(
      ownerId,
      dto,
    );
    return { conversation };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(@Param('id') id: string, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.messagesService.getMessages(ownerId, id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    const message = await this.messagesService.sendMessage(ownerId, id, dto);
    return { message };
  }
}
