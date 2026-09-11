import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AtsSessionService } from './ats-session.service';
import { StartAtsSessionDto } from './dto/ats-session.dto';

@ApiTags('ats')
@ApiBearerAuth()
@Controller('ats')
@UseGuards(JwtAuthGuard)
export class AtsSessionController {
  constructor(private readonly service: AtsSessionService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a logical ATS session in the existing résumé sandbox' })
  start(@Request() req, @Body() dto: StartAtsSessionDto) {
    return this.service.start(this.userId(req), dto);
  }

  @Get('resume-sessions/:resumeSessionId/latest')
  @ApiOperation({ summary: 'Latest persisted ATS result for a résumé session' })
  latest(@Request() req, @Param('resumeSessionId') resumeSessionId: string) {
    return this.service.latestForResume(this.userId(req), resumeSessionId);
  }

  @Post('sessions/:id/run')
  @ApiOperation({ summary: 'Run or refresh ATS analysis in the shared user sandbox' })
  run(@Request() req, @Param('id') id: string) {
    return this.service.run(this.userId(req), id);
  }

  @Get('sessions/:id')
  get(@Request() req, @Param('id') id: string) {
    return this.service.get(this.userId(req), id);
  }

  @Post('sessions/:id/end')
  end(@Request() req, @Param('id') id: string) {
    return this.service.end(this.userId(req), id);
  }

  @Delete('sessions/:id')
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(this.userId(req), id);
  }

  private userId(req: any): string {
    return String(req.user._id ?? req.user.id);
  }
}
