import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ROLE_ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @Query('role') role?: string,
    @Query('q') q?: string,
    @Query('plan') plan?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.adminList({ role, q, plan, isActive, page, limit });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch(':id/role')
  async setRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersService.adminSetRole(id, role);
  }

  @Patch(':id/suspend')
  async suspend(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.usersService.adminSuspend(id, reason);
  }

  @Patch(':id/reactivate')
  async reactivate(@Param('id') id: string) {
    return this.usersService.adminReactivate(id);
  }

  @Post(':id/password-reset')
  async passwordReset(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.usersService.requestPasswordReset({ email: user.email });
  }
}
