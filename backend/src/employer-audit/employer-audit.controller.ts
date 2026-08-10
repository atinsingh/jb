import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Request,
  Param,
  Query,
  Body,
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
import { EmployerAuditService } from './employer-audit.service';
import { CreateAuditEventDto } from './dto/create-audit-event.dto';
import { CreateDataRequestDto } from './dto/create-data-request.dto';
import { UpdateDataRequestDto } from './dto/update-data-request.dto';

@ApiTags('employer-audit')
@ApiBearerAuth('JWT-auth')
@Controller('employer/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerAuditController {
  constructor(private readonly auditService: EmployerAuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit events' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'ai', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async list(
    @Query('category') category: string,
    @Query('ai') ai: string,
    @Query('search') search: string,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.auditService.listEvents(ownerId, category, ai, search);
  }

  @Post()
  @ApiOperation({ summary: 'Append an audit event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  async create(@Body() dto: CreateAuditEventDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.auditService.createEvent(ownerId, dto);
  }
}

@ApiTags('employer-audit')
@ApiBearerAuth('JWT-auth')
@Controller('employer/compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerComplianceController {
  constructor(private readonly auditService: EmployerAuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get compliance data (requests, consents, retention)',
  })
  @ApiResponse({ status: 200, description: 'Compliance retrieved successfully' })
  async getCompliance(@Request() req) {
    const ownerId = req.user._id.toString();
    return this.auditService.getCompliance(ownerId);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create a data request' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  async createRequest(@Body() dto: CreateDataRequestDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.auditService.createRequest(ownerId, dto);
  }

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Update a data request status' })
  @ApiParam({ name: 'id', description: 'Data request ID' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  @ApiResponse({ status: 404, description: 'Data request not found' })
  async updateRequest(
    @Param('id') id: string,
    @Body() dto: UpdateDataRequestDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.auditService.updateRequestStatus(ownerId, id, dto.status);
  }
}
