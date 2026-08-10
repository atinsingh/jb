import {
  Controller,
  Get,
  Post,
  Patch,
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
import { EmployerOrgService } from './employer-org.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('employer-team')
@Controller('employer/team')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_EMPLOYER', 'ROLE_ADMIN')
export class EmployerOrgController {
  constructor(private readonly employerOrgService: EmployerOrgService) {}

  @Get('')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Get or create the caller's employer org" })
  @ApiResponse({ status: 200, description: 'Org retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrg(@Request() req) {
    const userId = req.user._id.toString();
    const org = await this.employerOrgService.getOrCreateOrg(userId);
    return {
      message: 'Org retrieved successfully',
      org,
    };
  }

  @Post('invite')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Invite a member to the employer org' })
  @ApiResponse({ status: 200, description: 'Member invited successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async inviteMember(@Body() dto: InviteMemberDto, @Request() req) {
    const userId = req.user._id.toString();
    const org = await this.employerOrgService.inviteMember(userId, dto);
    return {
      message: 'Member invited successfully',
      org,
    };
  }

  @Patch('members/:memberId/role')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Update a member's role" })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() req,
  ) {
    const userId = req.user._id.toString();
    const org = await this.employerOrgService.updateMemberRole(
      userId,
      memberId,
      dto,
    );
    return {
      message: 'Member role updated successfully',
      org,
    };
  }

  @Delete('members/:memberId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a member from the employer org' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async removeMember(@Param('memberId') memberId: string, @Request() req) {
    const userId = req.user._id.toString();
    const org = await this.employerOrgService.removeMember(userId, memberId);
    return {
      message: 'Member removed successfully',
      org,
    };
  }
}
