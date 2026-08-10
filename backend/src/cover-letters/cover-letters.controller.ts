import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoverLettersService } from './cover-letters.service';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { StorageService } from '../storage';

@ApiTags('cover-letters')
@ApiBearerAuth()
@Controller('cover-letters')
@UseGuards(JwtAuthGuard)
export class CoverLettersController {
  constructor(
    private readonly coverLettersService: CoverLettersService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all cover letters for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of cover letters' })
  async findAll(@Request() req) {
    const coverLetters = await this.coverLettersService.findAll(req.user._id.toString());
    return coverLetters.map((letter) => ({
      id: letter._id,
      createdAt: letter.createdAt,
      role: letter.jobTitle,
      company: letter.companyName,
      template: letter.template,
      pdfUrl: letter.pdfUrl,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific cover letter' })
  @ApiResponse({ status: 200, description: 'Cover letter details' })
  @ApiResponse({ status: 404, description: 'Cover letter not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const coverLetter = await this.coverLettersService.findOne(id, req.user._id.toString());
    return {
      id: coverLetter._id,
      jobTitle: coverLetter.jobTitle,
      companyName: coverLetter.companyName,
      jobDescription: coverLetter.jobDescription,
      additionalInfo: coverLetter.additionalInfo,
      template: coverLetter.template,
      content: coverLetter.content,
      pdfUrl: coverLetter.pdfUrl,
      createdAt: coverLetter.createdAt,
    };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new cover letter with AI' })
  @ApiResponse({ status: 201, description: 'Cover letter generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async generate(
    @Body() generateDto: GenerateCoverLetterDto,
    @Request() req,
  ) {
    const coverLetter = await this.coverLettersService.generate(
      req.user._id.toString(),
      generateDto,
    );

    return {
      id: coverLetter._id,
      jobTitle: coverLetter.jobTitle,
      companyName: coverLetter.companyName,
      template: coverLetter.template,
      content: coverLetter.content,
      pdfUrl: coverLetter.pdfUrl,
      createdAt: coverLetter.createdAt,
    };
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an existing cover letter with AI' })
  @ApiResponse({ status: 201, description: 'Cover letter regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Cover letter not found' })
  async regenerate(@Param('id') id: string, @Request() req) {
    const userId = req.user._id.toString();
    // Load the source letter, then re-run the existing generate pipeline with
    // its own job context so we reuse the service logic rather than duplicating it.
    const existing = await this.coverLettersService.findOne(id, userId);
    const coverLetter = await this.coverLettersService.generate(userId, {
      jobTitle: existing.jobTitle,
      companyName: existing.companyName,
      jobDescription: existing.jobDescription || existing.jobTitle || existing.companyName,
      additionalInfo: existing.additionalInfo,
      template: existing.template || 'professional',
    });

    return {
      id: coverLetter._id,
      jobTitle: coverLetter.jobTitle,
      companyName: coverLetter.companyName,
      template: coverLetter.template,
      content: coverLetter.content,
      body: coverLetter.content,
      pdfUrl: coverLetter.pdfUrl,
      createdAt: coverLetter.createdAt,
    };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download cover letter PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiResponse({ status: 404, description: 'PDF not found' })
  async getPDF(@Param('id') id: string, @Request() req, @Res() res: Response) {
    try {
      const key = await this.coverLettersService.getPDFPath(id, req.user._id.toString());

      // Read object from storage and send
      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await this.storageService.getBuffer(key);
      } catch {
        throw new NotFoundException('PDF file not found');
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="cover-letter-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Failed to retrieve PDF');
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cover letter' })
  @ApiResponse({ status: 200, description: 'Cover letter deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cover letter not found' })
  async delete(@Param('id') id: string, @Request() req) {
    await this.coverLettersService.delete(id, req.user._id.toString());
    return { message: 'Cover letter deleted successfully' };
  }
}

