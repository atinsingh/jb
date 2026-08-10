import {
  Controller,
  Get,
  Post,
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
import { EmployerApprovalsService } from './employer-approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { DecisionDto } from './dto/decision.dto';

@ApiTags('employer-approvals')
@ApiBearerAuth('JWT-auth')
@Controller('employer/approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerApprovalsController {
  constructor(
    private readonly approvalsService: EmployerApprovalsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List requisition approvals for the owner' })
  @ApiResponse({ status: 200, description: 'Approvals retrieved successfully' })
  async list(@Request() req) {
    const ownerId = req.user._id.toString();
    const approvals = await this.approvalsService.list(ownerId);
    return { approvals };
  }

  @Post()
  @ApiOperation({ summary: 'Create a requisition approval' })
  @ApiResponse({ status: 201, description: 'Approval created successfully' })
  async create(@Body() dto: CreateApprovalDto, @Request() req) {
    const ownerId = req.user._id.toString();
    return this.approvalsService.create(ownerId, dto);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Record an approval decision on a chain step' })
  @ApiParam({ name: 'id', description: 'Approval ID' })
  @ApiResponse({ status: 200, description: 'Decision recorded successfully' })
  @ApiResponse({ status: 404, description: 'Approval not found' })
  async decide(
    @Param('id') id: string,
    @Body() dto: DecisionDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.approvalsService.decide(ownerId, id, dto);
  }
}
