import { Controller, Get, Put, UseGuards, Request, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserPreferencesService } from './user-preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('user-preferences')
@Controller('users/preferences')
@UseGuards(JwtAuthGuard)
export class UserPreferencesController {
  constructor(private prefsService: UserPreferencesService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user job preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getMine(@Request() req) {
    const prefs = await this.prefsService.getOrCreate(req.user._id.toString());
    return { message: 'Preferences retrieved', preferences: prefs };
  }

  @Put()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update current user job preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updateMine(@Request() req, @Body() dto: UpdatePreferencesDto) {
    const prefs = await this.prefsService.update(req.user._id.toString(), dto);
    return { message: 'Preferences updated', preferences: prefs };
  }
}
