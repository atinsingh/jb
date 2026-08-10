import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EmployerSecurityService } from './employer-security.service';
import { UpdateSecurityDto } from './dto/update-security.dto';

@ApiTags('employer-security')
@ApiBearerAuth('JWT-auth')
@Controller('employer/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerSecurityController {
  constructor(private readonly securityService: EmployerSecurityService) {}

  @Get()
  @ApiOperation({ summary: 'Get SSO / access / session security settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async get(@Request() req) {
    const ownerId = req.user._id.toString();
    const settings = await this.securityService.getOrCreateSecurity(ownerId);
    return { settings };
  }

  @Patch()
  @ApiOperation({ summary: 'Update security settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async update(@Body() dto: UpdateSecurityDto, @Request() req) {
    const ownerId = req.user._id.toString();
    const settings = await this.securityService.update(ownerId, dto);
    return { settings };
  }
}
