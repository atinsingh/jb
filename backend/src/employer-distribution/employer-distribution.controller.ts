import {
  Controller,
  Get,
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
import { EmployerDistributionService } from './employer-distribution.service';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('employer-distribution')
@ApiBearerAuth('JWT-auth')
@Controller('employer/distribution')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerDistributionController {
  constructor(
    private readonly distributionService: EmployerDistributionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get distribution channels and performance' })
  @ApiResponse({ status: 200, description: 'Distribution retrieved successfully' })
  async getDistribution(@Request() req) {
    const ownerId = req.user._id.toString();
    return this.distributionService.getDistribution(ownerId);
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Update a distribution channel' })
  @ApiParam({ name: 'key', description: 'Channel key' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async updateChannel(
    @Param('key') key: string,
    @Body() dto: UpdateChannelDto,
    @Request() req,
  ) {
    const ownerId = req.user._id.toString();
    return this.distributionService.updateChannel(ownerId, key, dto);
  }
}
