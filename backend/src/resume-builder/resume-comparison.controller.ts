import { BadRequestException, Body, Controller, Get, Param, Post, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeComparisonService } from './resume-comparison.service';

@ApiTags('resume-builder')
@ApiBearerAuth()
@Controller('resume-builder')
@UseGuards(JwtAuthGuard)
export class ResumeComparisonController {
  constructor(private readonly comparison: ResumeComparisonService) {}

  @Post(':id/compare/source')
  @UseInterceptors(FileInterceptor('resume', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, done) => {
      const valid = ['.pdf', '.doc', '.docx'].includes(extname(file.originalname).toLowerCase());
      done(valid ? null : new BadRequestException('Only PDF, DOC, and DOCX files are supported.'), valid);
    },
  }))
  async attachSource(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No resume file uploaded');
    return this.comparison.attachSource(id, req.user._id.toString(), file);
  }

  @Get(':id/compare/source')
  async getSource(@Param('id') id: string, @Request() req: any, @Res() response: Response) {
    const source = await this.comparison.getSource(id, req.user._id.toString());
    response.setHeader('Content-Type', source.mimeType);
    response.setHeader('Content-Disposition', 'inline');
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(source.buffer);
  }

  @Post(':id/compare')
  @ApiOperation({ summary: 'Compare an imported resume with deterministic document, job-match and content checks' })
  compare(
    @Param('id') id: string,
    @Body() body: { jobDescription?: string; jobUrl?: string; forceRefresh?: boolean },
    @Request() req: any,
  ) {
    return this.comparison.compare(id, req.user._id.toString(), body || {});
  }
}
