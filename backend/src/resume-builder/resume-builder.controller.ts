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
import { GenerateResumeDto, GenerateSectionDto } from './dto/generate-resume.dto';
import { UpdateResumeDto, CreateShareLinkDto } from './dto/resume-operations.dto';
import { Public } from '../common/decorators/public.decorator';
import { StorageService } from '../storage';

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
  constructor(
    private readonly resumeBuilderService: ResumeBuilderService,
    private readonly storageService: StorageService,
  ) { }

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
      // Library / workspace metadata
      status: resume.status || 'draft',
      creationMethod: resume.creationMethod || 'manual',
      targetRole: resume.targetRole || null,
      targetCompany: resume.targetCompany || null,
      tags: resume.tags || [],
      isPrimary: !!resume.isPrimary,
      atsScore: typeof resume.atsScore === 'number' ? resume.atsScore : null,
      applicationCount: resume.applicationCount || 0,
      version: resume.version || 1,
      source: resume.source || null,
      sourceResumeId: resume.sourceResumeId || null,
      archivedAt: resume.archivedAt || null,
      // Lightweight completeness signal for the card (no full content payload)
      sections: {
        hasSummary: !!resume.summary,
        experienceCount: Array.isArray(resume.experience) ? resume.experience.length : 0,
        skillsCount: Array.isArray(resume.skills) ? resume.skills.length : 0,
      },
    }));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  async create(@Body() createDto: CreateResumeDto, @Request() req) {
    const resume = await this.resumeBuilderService.create(req.user._id.toString(), createDto);
    return resume;
  }

  @Post('import')
  @ApiOperation({ summary: 'Create a resume from parsed import data + source metadata' })
  @ApiResponse({ status: 201, description: 'Resume imported successfully' })
  async import(@Body() body: any, @Request() req) {
    return this.resumeBuilderService.importResume(req.user._id.toString(), body);
  }

  // ---------------------------------------------------------------------
  // Collection-level routes (POST generate / POST generate/section) — must
  // stay declared here, before every `:id`-prefixed route that follows
  // (':id/duplicate', ':id/primary' and the rest), or Nest's parameterised
  // matching would be free to treat "generate" as an :id value.
  // ---------------------------------------------------------------------

  @Post('generate')
  @ApiOperation({ summary: "Generate a tailored résumé draft from the candidate's existing facts (does not save)" })
  @ApiResponse({ status: 200, description: 'Generated résumé draft' })
  @ApiResponse({ status: 400, description: 'No source résumé or profile experience to generate from' })
  async generate(@Body() generateDto: GenerateResumeDto, @Request() req) {
    return this.resumeBuilderService.generate(req.user._id.toString(), generateDto);
  }

  @Post('generate/section')
  @ApiOperation({ summary: 'Regenerate exactly one section of a résumé draft' })
  @ApiResponse({ status: 200, description: 'Regenerated section content' })
  async generateSection(@Body() generateSectionDto: GenerateSectionDto, @Request() req) {
    return this.resumeBuilderService.generateSection(req.user._id.toString(), generateSectionDto);
  }

  @Post(':id/ats-check')
  @ApiOperation({ summary: 'Score how well an ATS can read this résumé (deterministic, persisted)' })
  @ApiResponse({ status: 200, description: 'Score plus findings, each with an actionable fix' })
  async atsCheck(@Param('id') id: string, @Request() req) {
    return this.resumeBuilderService.checkAts(id, req.user._id.toString());
  }

  @Post(':id/ats-match')
  @ApiOperation({ summary: 'Coverage of this résumé against a specific job description (ephemeral)' })
  @ApiResponse({ status: 200, description: 'Coverage percentage plus matched and missing concepts' })
  async atsMatch(
    @Param('id') id: string,
    @Body('jobDescription') jobDescription: string,
    @Request() req,
  ) {
    // Never writes atsScore — a JD-relative number would make the stored score
    // meaningless without a job attached.
    return this.resumeBuilderService.matchAts(id, req.user._id.toString(), jobDescription);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a resume into a new independent resume' })
  async duplicate(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.resumeBuilderService.duplicate(id, req.user._id.toString(), body?.name);
  }

  @Patch(':id/primary')
  @ApiOperation({ summary: 'Set a resume as the primary / default resume' })
  async setPrimary(@Param('id') id: string, @Request() req) {
    return this.resumeBuilderService.setPrimary(id, req.user._id.toString());
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
      const key = await this.resumeBuilderService.getPDFPath(id, req.user._id.toString());

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await this.storageService.getBuffer(key);
      } catch {
        throw new NotFoundException('PDF file not found');
      }

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
  @ApiResponse({ status: 200, description: 'PDF generated (inline) or queued' })
  async generatePDF(@Param('id') id: string, @Request() req) {
    // Producer: enqueues when QUEUE_ENABLED=true, otherwise runs inline and
    // returns { queued:false, pdfUrl, message } exactly as before (backward
    // compatible — the frontend keeps polling GET :id/pdf either way).
    return this.resumeBuilderService.requestPdfGeneration(
      id,
      req.user._id.toString(),
    );
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

