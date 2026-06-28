import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResumeBuilderService } from './resume-builder.service';
import { CreateResumeDto, UpdateResumeSectionDto, RegenerateSectionDto } from './dto/create-resume.dto';
import { UpdateResumeDto, CreateShareLinkDto } from './dto/resume-operations.dto';
import { Public } from '../common/decorators/public.decorator';
import * as fs from 'fs/promises';

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  const allowedTypes = ['.pdf', '.doc', '.docx'];
  const ext = extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Invalid file type. Only PDF, DOC, DOCX allowed.'), false);
  }
};

@ApiTags('resume-builder')
@ApiBearerAuth()
@Controller('resume-builder')
@UseGuards(JwtAuthGuard)
export class ResumeBuilderController {
  constructor(private readonly resumeBuilderService: ResumeBuilderService) { }

  @Get()
  @ApiOperation({ summary: 'Get all resumes for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  async findAll(@Request() req) {
    const resumes = await this.resumeBuilderService.findAll(req.user._id.toString());
    return resumes.map((resume) => ({
      id: resume._id,
      name: resume.name,
      template: resume.template,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      pdfUrl: resume.pdfUrl,
      isDefault: resume.isDefault,
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  async create(@Body() createDto: CreateResumeDto, @Request() req) {
    const resume = await this.resumeBuilderService.create(req.user._id.toString(), createDto);
    return resume;
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter,
    }),
  )
  @ApiOperation({ summary: 'Create resume from uploaded file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: {
          type: 'string',
          format: 'binary',
        },
        template: {
          type: 'string',
          example: 'modern',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Resume created from upload' })
  async createFromUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('template') template: string,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!template) {
      throw new BadRequestException('Template is required');
    }

    const resume = await this.resumeBuilderService.createFromUpload(
      req.user._id.toString(),
      file,
      template,
    );

    return resume;
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download resume PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  @ApiResponse({ status: 404, description: 'PDF not found' })
  async getPDF(@Param('id') id: string, @Request() req, @Res() res: Response) {
    try {
      const pdfPath = await this.resumeBuilderService.getPDFPath(id, req.user._id.toString());

      try {
        await fs.access(pdfPath);
      } catch {
        throw new NotFoundException('PDF file not found');
      }

      const pdfBuffer = await fs.readFile(pdfPath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="resume-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Failed to retrieve PDF');
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific resume' })
  @ApiResponse({ status: 200, description: 'Resume details' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const resume = await this.resumeBuilderService.findOne(id, req.user._id.toString());
    return resume;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update resume' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() updates: Partial<any>,
    @Request() req,
  ) {
    const resume = await this.resumeBuilderService.update(id, req.user._id.toString(), updates);
    return resume;
  }

  @Patch(':id/autosave')
  @ApiOperation({ summary: 'Autosave resume with optimistic locking' })
  @ApiResponse({ status: 200, description: 'Resume saved' })
  @ApiResponse({ status: 409, description: 'Conflict - Resume modified by another process' })
  async autosave(
    @Param('id') id: string,
    @Body() updateDto: UpdateResumeDto,
    @Request() req,
  ) {
    return this.resumeBuilderService.autosave(id, req.user._id.toString(), updateDto);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Create a named version/snapshot' })
  async createVersion(
    @Param('id') id: string,
    @Body('description') description: string,
    @Request() req,
  ) {
    return this.resumeBuilderService.createVersion(id, req.user._id.toString(), description);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history' })
  async getVersions(@Param('id') id: string, @Request() req) {
    return this.resumeBuilderService.getVersions(id, req.user._id.toString());
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Create or update share link' })
  async share(
    @Param('id') id: string,
    @Body() shareDto: CreateShareLinkDto,
    @Request() req,
  ) {
    return this.resumeBuilderService.createShareLink(id, req.user._id.toString(), shareDto);
  }

  @Post(':id/regenerate-section')
  @ApiOperation({ summary: 'Regenerate a section using AI' })
  @ApiResponse({ status: 200, description: 'Section regenerated successfully' })
  async regenerateSection(
    @Param('id') id: string,
    @Body() regenerateDto: RegenerateSectionDto,
    @Request() req,
  ) {
    const content = await this.resumeBuilderService.regenerateSection(
      id,
      req.user._id.toString(),
      regenerateDto,
    );

    return { content };
  }

  @Post(':id/generate-pdf')
  @ApiOperation({ summary: 'Generate PDF for resume' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  async generatePDF(@Param('id') id: string, @Request() req) {
    const resume = await this.resumeBuilderService.findOne(id, req.user._id.toString());
    const pdfPath = await this.resumeBuilderService.generatePDF(resume, req.user._id.toString());

    resume.pdfPath = pdfPath;
    resume.pdfUrl = `/api/resume-builder/${resume._id}/pdf`;
    await resume.save();

    return {
      pdfUrl: resume.pdfUrl,
      message: 'PDF generated successfully',
    };
  }

  @Public()
  @Post('shared/:slug/view')
  @ApiOperation({ summary: 'View a shared resume' })
  async viewShared(
    @Param('slug') slug: string,
    @Body('password') password?: string,
  ) {
    return this.resumeBuilderService.getSharedResume(slug, password);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  async delete(@Param('id') id: string, @Request() req) {
    await this.resumeBuilderService.delete(id, req.user._id.toString());
    return { message: 'Resume deleted successfully' };
  }
}

