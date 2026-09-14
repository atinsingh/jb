import { Body, Controller, Get, Patch, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SupabaseUserSyncService } from './supabase-user-sync.service';
import { SwitchWorkspaceDto } from './dto/switch-workspace.dto';

/**
 * What is left of the auth controller after Supabase took over identity.
 *
 * Register, login, logout, and the Google and LinkedIn callbacks are gone —
 * Supabase Auth owns all of them now, and the frontend talks to it directly.
 * Nothing in this codebase mints a token or writes a password hash any more.
 *
 * `GET /auth/me` survives, and is load-bearing: Supabase holds identity only,
 * so this is how the frontend reads the parts of a user Supabase does not know
 * about — `role`, plan, and Stripe subscription state, all of which live on the
 * Mongo User document that `JwtAuthGuard` has already resolved.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly userSync: SupabaseUserSyncService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns the current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    this.logger.debug(`Getting current user: ${req.user?.email || 'unknown'}`);
    return { user: req.user };
  }

  @Patch('workspace')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Switch between candidate and employer workspaces' })
  @ApiResponse({ status: 200, description: 'Returns the user with the active role' })
  @ApiResponse({ status: 400, description: 'Role is not self-selectable' })
  async switchWorkspace(@Request() req, @Body() dto: SwitchWorkspaceDto) {
    return { user: await this.userSync.switchWorkspaceRole(req.user, dto.role) };
  }
}
