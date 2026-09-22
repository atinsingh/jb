import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeComparisonService } from './resume-comparison.service';

@ApiTags('resume-builder')
@ApiBearerAuth()
@Controller('resume-builder')
@UseGuards(JwtAuthGuard)
export class ResumeComparisonController {
  constructor(private readonly comparison: ResumeComparisonService) {}

  @Post(':id/compare')
  @ApiOperation({ summary: 'Compare an imported resume using ATS and AI-content signals' })
  compare(
    @Param('id') id: string,
    @Body() body: { jobDescription?: string },
    @Request() req: any,
  ) {
    return this.comparison.compare(id, req.user._id.toString(), body || {});
  }
}
