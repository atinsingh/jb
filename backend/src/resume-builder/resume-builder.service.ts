import { Injectable, NotFoundException, Logger, ConflictException, ForbiddenException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_PDF, JOB_GENERATE_PDF } from '../queue/queue.constants';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';
import { ResumeParserService } from '../resume/resume-parser.service';
import { ResumeService } from '../resume/resume.service';
import { CreateResumeDto, RegenerateSectionDto } from './dto/create-resume.dto';
import { StorageService } from '../storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ResumeVersion, ResumeVersionDocument } from '../schemas/resume-version.schema';
import { ShareLink, ShareLinkDocument } from '../schemas/share-link.schema';
import { UpdateResumeDto, CreateShareLinkDto } from './dto/resume-operations.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { HtmlSanitizerService } from '../ingestion/pipeline/html-sanitizer.service';

@Injectable()
export class ResumeBuilderService {
  private readonly logger = new Logger(ResumeBuilderService.name);

  // Resume fields that the preview components render as raw HTML
  // (dangerouslySetInnerHTML). These are the stored-XSS sinks and must be
  // sanitized on every write. Scalar fields plus per-item fields inside the
  // experience/education/projects arrays.
  private static readonly HTML_SCALAR_FIELDS = ['summary', 'profileSummary'];
  private static readonly HTML_ARRAY_FIELDS = ['experience', 'education', 'projects'];
  private static readonly HTML_ITEM_FIELDS = ['description', 'responsibilities', 'desc'];

  constructor(
    @InjectModel(Resume.name)
    private resumeModel: Model<ResumeDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(ResumeVersion.name)
    private resumeVersionModel: Model<ResumeVersionDocument>,
    @InjectModel(ShareLink.name)
    private shareLinkModel: Model<ShareLinkDocument>,
    private readonly llmRoutingService: LLMRoutingService,
    private resumeParserService: ResumeParserService,
    private jwtService: JwtService,
    private readonly storageService: StorageService,
    private readonly htmlSanitizer: HtmlSanitizerService,
    // Background PDF queue. `@Optional()` → undefined when QUEUE_ENABLED !== 'true'
    // (queue not registered), which is the signal to run generation inline.
    @Optional() @InjectQueue(QUEUE_PDF) private readonly pdfQueue?: Queue,
  ) {}

  /**
   * Strip scripts/handlers from the rich-text fields a resume renders as raw
   * HTML. Mutates and returns the given payload in place. Called from every
   * write path (create/update/autosave/import) so a malicious `<img onerror>`
   * can never reach the preview page, the PDF renderer, or a public share link.
   */
  private sanitizeResumeHtml<T extends Record<string, any>>(data: T): T {
    if (!data || typeof data !== 'object') return data;

    for (const field of ResumeBuilderService.HTML_SCALAR_FIELDS) {
      if (typeof data[field] === 'string') {
        (data as any)[field] = this.htmlSanitizer.sanitize(data[field]);
      }
    }

    for (const field of ResumeBuilderService.HTML_ARRAY_FIELDS) {
      if (Array.isArray(data[field])) {
        (data as any)[field] = data[field].map((item: any) => {
          if (!item || typeof item !== 'object') return item;
          for (const key of ResumeBuilderService.HTML_ITEM_FIELDS) {
            if (typeof item[key] === 'string') {
              item[key] = this.htmlSanitizer.sanitize(item[key]);
            }
          }
          if (Array.isArray(item.achievements)) {
            item.achievements = item.achievements.map((a: any) =>
              typeof a === 'string' ? this.htmlSanitizer.sanitize(a) : a,
            );
          }
          return item;
        });
      }
    }

    return data;
  }

  async findAll(userId: string): Promise<ResumeDocument[]> {
    return this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return resume;
  }

  async create(userId: string, createDto: CreateResumeDto): Promise<ResumeDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let resumeData: any = {
      userId: new Types.ObjectId(userId),
      template: createDto.template,
      name: createDto.name || 'Untitled Resume',
    };

    // Import from user profile if requested
    if (createDto.importFromProfile) {
      resumeData = {
        ...resumeData,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        summary: user.summary,
        skills: user.skills || [],
        experience: user.experience || [],
        education: user.education || [],
      };
    }

    const resume = new this.resumeModel(this.sanitizeResumeHtml(resumeData));
    return resume.save();
  }

  async createFromUpload(
    userId: string,
    file: Express.Multer.File,
    template: string,
  ): Promise<ResumeDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Parse uploaded resume
    const parseResult = await this.resumeParserService.parseResume(file, userId);

    // Create resume from parsed data
    const resume = new this.resumeModel(this.sanitizeResumeHtml({
      userId: new Types.ObjectId(userId),
      template,
      name: `Resume - ${parseResult.parsedData.name || 'Imported'}`,
      fullName: parseResult.parsedData.name,
      email: parseResult.parsedData.email,
      phone: parseResult.parsedData.phone,
      summary: parseResult.parsedData.summary,
      skills: parseResult.parsedData.skills || [],
      experience: parseResult.parsedData.experience || [],
      education: parseResult.parsedData.education || [],
    }));

    return resume.save();
  }

  // Section fields the importer is allowed to persist onto a resume.
  private static readonly IMPORT_SECTION_KEYS = [
    'fullName', 'email', 'phone', 'location', 'website', 'linkedin', 'github',
    'summary', 'profileSummary', 'skills', 'experience', 'education',
    'certifications', 'projects', 'languages', 'customSections',
  ];

  /**
   * Create a resume from already-parsed structured data plus the original
   * file's source metadata. Powers the "Keep Original Format" / "Rewrite with
   * AI" import modes — the resume then appears in the library with filename,
   * format, size and import date.
   */
  async importResume(userId: string, body: any): Promise<ResumeDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const defaultName = body?.source?.originalFilename
      ? String(body.source.originalFilename).replace(/\.[^.]+$/, '')
      : 'Imported Resume';

    const data: any = {
      userId: new Types.ObjectId(userId),
      template: body.template || 'modern',
      name: body.name || defaultName,
      creationMethod: body.importMode === 'ai_rewrite' ? 'ai_rewrite' : 'imported',
      status: body.status || 'needs_review',
      targetRole: body.targetRole,
      targetCompany: body.targetCompany,
      tags: Array.isArray(body.tags) ? body.tags : [],
      source: body.source
        ? {
            ...body.source,
            importedAt: body.source.importedAt ? new Date(body.source.importedAt) : new Date(),
            importMode: body.importMode || body.source.importMode || 'keep_format',
          }
        : null,
    };

    for (const k of ResumeBuilderService.IMPORT_SECTION_KEYS) {
      if (body[k] !== undefined) data[k] = body[k];
    }

    const resume = new this.resumeModel(this.sanitizeResumeHtml(data));
    const saved = await resume.save();
    if (body.isPrimary) return this.setPrimary(saved._id.toString(), userId);
    return saved;
  }

  /** Clone a resume into a brand-new, independent resume (own version history). */
  async duplicate(id: string, userId: string, name?: string): Promise<ResumeDocument> {
    const src = await this.findOne(id, userId);
    const obj: any = src.toObject();
    ['_id', '__v', 'createdAt', 'updatedAt', 'publicUrl', 'isPublic', 'pdfUrl', 'pdfPath'].forEach(
      (k) => delete obj[k],
    );
    obj.name = name || `${src.name} (copy)`;
    obj.version = 1;
    obj.isPrimary = false;
    obj.creationMethod = 'duplicate';
    obj.sourceResumeId = src._id;
    obj.archivedAt = undefined;
    if (obj.status === 'archived') obj.status = 'draft';
    const copy = new this.resumeModel(obj);
    return copy.save();
  }

  /** Mark one resume primary and clear the flag on all the user's others. */
  async setPrimary(id: string, userId: string): Promise<ResumeDocument> {
    const uid = new Types.ObjectId(userId);
    await this.resumeModel.updateMany({ userId: uid }, { $set: { isPrimary: false } }).exec();
    const resume = await this.resumeModel
      .findOneAndUpdate({ _id: id, userId: uid }, { $set: { isPrimary: true } }, { new: true })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async update(id: string, userId: string, updates: Partial<Resume>): Promise<ResumeDocument> {
    const resume = await this.findOne(id, userId);

    // Keep archivedAt in sync with the status field for library filtering.
    if ((updates as any).status === 'archived' && !resume.archivedAt) {
      (updates as any).archivedAt = new Date();
    } else if ((updates as any).status && (updates as any).status !== 'archived') {
      (updates as any).archivedAt = undefined;
    }

    // Prevent direct version manipulation via generic update
    delete updates.version;

    Object.assign(resume, this.sanitizeResumeHtml(updates as any));
    return resume.save();
  }

  async autosave(id: string, userId: string, updateDto: UpdateResumeDto): Promise<ResumeDocument> {
    const resume = await this.findOne(id, userId);

    // Optimistic Concurrency Control
    if (updateDto.version !== undefined && resume.version !== updateDto.version) {
      throw new ConflictException('Resume has been modified by another process. Please refresh.');
    }

    if (updateDto.name) {
      resume.name = updateDto.name;
    }

    if (updateDto.content) {
      // Update each field present in content
      Object.assign(resume, this.sanitizeResumeHtml(updateDto.content as any));
    }

    // Increment version
    resume.version = (resume.version || 0) + 1;

    return resume.save();
  }

  async createVersion(id: string, userId: string, description?: string): Promise<ResumeVersionDocument> {
    const resume = await this.findOne(id, userId);

    const version = new this.resumeVersionModel({
      resumeId: resume._id,
      version: resume.version,
      content: resume.toObject(),
      description: description || `Version ${resume.version}`,
    });

    return version.save();
  }

  async getVersions(id: string, userId: string): Promise<ResumeVersionDocument[]> {
    await this.findOne(id, userId); // Ensure access rights
    return this.resumeVersionModel.find({ resumeId: id }).sort({ version: -1 }).exec();
  }

  async createShareLink(id: string, userId: string, dto: CreateShareLinkDto): Promise<ShareLinkDocument> {
    await this.findOne(id, userId); // Ensure access rights

    let shareLink = await this.shareLinkModel.findOne({ resumeId: id }).exec();

    if (!shareLink) {
      shareLink = new this.shareLinkModel({
        resumeId: id,
        slug: uuidv4(), // Generate unique slug
      });
    }

    shareLink.isActive = true;
    shareLink.isPublic = dto.isPublic !== undefined ? dto.isPublic : shareLink.isPublic; // Default true in schema, but respect update

    if (dto.password) {
      shareLink.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.expiresInDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + dto.expiresInDays);
      shareLink.expiresAt = expirationDate;
    }

    return shareLink.save();
  }

  async getSharedResume(slug: string, password?: string): Promise<ResumeDocument> {
    const shareLink = await this.shareLinkModel.findOne({ slug, isActive: true }).exec();

    if (!shareLink) {
      throw new NotFoundException('Resume not found or link expired');
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new NotFoundException('Share link expired');
    }

    if (shareLink.passwordHash) {
      if (!password) {
        throw new ForbiddenException('Password required');
      }
      const isMatch = await bcrypt.compare(password, shareLink.passwordHash);
      if (!isMatch) {
        throw new ForbiddenException('Invalid password');
      }
    }

    // Increment views
    shareLink.views += 1;
    await shareLink.save();

    // Sanitize on read too: resumes created before write-sanitization landed may
    // still hold raw HTML, and this is the one endpoint that serves them to an
    // unauthenticated audience. Return a lean object so we don't persist over
    // the stored doc here.
    const resume = await this.resumeModel.findById(shareLink.resumeId).lean().exec();
    if (!resume) {
      throw new NotFoundException('Resume not found or link expired');
    }
    return this.sanitizeResumeHtml(resume) as unknown as ResumeDocument;
  }

  async regenerateSection(
    id: string,
    userId: string,
    regenerateDto: RegenerateSectionDto,
  ): Promise<string> {
    const resume = await this.findOne(id, userId);
    const user = await this.userModel.findById(userId).exec();

    const sectionPrompts = {
      summary: `Generate a professional summary for this candidate. Make it compelling and highlight key strengths.

Candidate Information:
- Name: ${resume.fullName || user?.name || 'Candidate'}
- Skills: ${(resume.skills || []).join(', ')}
- Experience: ${JSON.stringify(resume.experience || [])}
${regenerateDto.jobDescription ? `- Target Job: ${regenerateDto.jobDescription}` : ''}
${regenerateDto.context ? `- Additional Context: ${regenerateDto.context}` : ''}

Write a professional summary (2-3 sentences) that highlights the candidate's expertise, experience, and value proposition.`,

      profileSummary: `Generate a comprehensive profile summary for this candidate. This should be more detailed than a brief summary, providing a complete overview of the candidate's professional background, achievements, and career highlights.

Candidate Information:
- Name: ${resume.fullName || user?.name || 'Candidate'}
- Skills: ${(resume.skills || []).join(', ')}
- Experience: ${JSON.stringify(resume.experience || [])}
- Education: ${JSON.stringify(resume.education || [])}
${regenerateDto.jobDescription ? `- Target Job: ${regenerateDto.jobDescription}` : ''}
${regenerateDto.context ? `- Additional Context: ${regenerateDto.context}` : ''}

Write a comprehensive profile summary (4-6 sentences or 2-3 paragraphs) that:
- Provides a complete professional overview
- Highlights key achievements and career progression
- Showcases expertise and value proposition
- Demonstrates impact and results
- Uses rich, engaging language suitable for a resume profile section`,

      experience: `Rewrite and enhance this work experience entry to be more impactful and ATS-friendly. Use action verbs and quantify achievements where possible.

Current Experience:
${JSON.stringify(resume.experience || [])}
${regenerateDto.jobDescription ? `Target Job: ${regenerateDto.jobDescription}` : ''}

Rewrite each experience entry with:
- Strong action verbs
- Quantified achievements
- Relevant keywords
- Clear impact statements`,

      skills: `Analyze the candidate's experience and generate a comprehensive list of relevant skills, organized by category.

Experience: ${JSON.stringify(resume.experience || [])}
Education: ${JSON.stringify(resume.education || [])}
${regenerateDto.jobDescription ? `Target Job Requirements: ${regenerateDto.jobDescription}` : ''}

Generate a list of relevant skills, including:
- Technical skills
- Soft skills
- Tools and technologies
- Industry-specific skills`,

      education: `Enhance the education section to be more detailed and professional.

Current Education: ${JSON.stringify(resume.education || [])}

Provide enhanced education entries with:
- Full degree names
- Institution details
- Relevant coursework or achievements
- Academic honors if applicable`,
    };

    const prompt = sectionPrompts[regenerateDto.section] || `Generate content for the ${regenerateDto.section} section based on the candidate's profile.`;

    try {
      // Route through the modern llm/ stack using the REWRITE_BULLETS feature
      // config. `getProviderForFeature` returns the configured provider (or
      // MockProvider when no API key is present).
      const provider = this.llmRoutingService.getProviderForFeature(
        LLMFeature.REWRITE_BULLETS,
      );
      const config = this.llmRoutingService.getFeatureConfig(
        LLMFeature.REWRITE_BULLETS,
      );

      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are a professional resume writer. Generate optimized, ATS-friendly content for resume sections. Return only the content, no explanations.`,
          },
          { role: 'user', content: prompt },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      if (response?.content) {
        return response.content.trim();
      }

      // Preserve the prior behavior of hard-failing when nothing usable comes
      // back (this flow has no soft fallback).
      throw new Error('AI generation failed');
    } catch (error) {
      this.logger.error(`Error regenerating ${regenerateDto.section}:`, error);
      throw new Error(`Failed to regenerate ${regenerateDto.section}`);
    }
  }

  async generatePDF(resume: ResumeDocument, userId?: string): Promise<string> {
    let browser;
    try {
      this.logger.debug(`Starting PDF generation for resume ${resume._id}`);
      
      // Launch puppeteer
      // In production/docker, might need args like --no-sandbox
      this.logger.debug('Launching Puppeteer browser...');
      browser = await require('puppeteer').launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });
      const page = await browser.newPage();

      // Configure viewport for A4 at higher resolution for better quality
      // A4 at 96dpi = 794x1123, but we'll use 2x for sharper rendering
      await page.setViewport({ 
        width: 1588,  // 794 * 2
        height: 2246, // 1123 * 2
        deviceScaleFactor: 1
      });

      // Navigate to the new preview route
      // Use INTERNAL_FRONTEND_URL for container-to-container communication if available
      const frontendUrl = process.env.INTERNAL_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Generate a temporary token for Puppeteer to access the preview page
      let previewUrl = `${frontendUrl}/resume/preview/${resume._id}`;
      if (userId) {
        try {
          const user = await this.userModel.findById(userId);
          if (user) {
            const payload = {
              id: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
            };
            const token = this.jwtService.sign(payload, { expiresIn: '5m' }); // Short-lived token for PDF generation
            previewUrl = `${previewUrl}?token=${encodeURIComponent(token)}`;
            this.logger.debug('Generated token for PDF preview', {
              tokenLength: token.length,
              tokenPreview: token.substring(0, 20) + '...',
              previewUrl: previewUrl.replace(/\?token=[^&]+/, '?token=***'),
            });
          }
        } catch (tokenError) {
          this.logger.warn('Failed to generate token for preview, proceeding without token:', tokenError);
        }
      }
      
      this.logger.debug(`Navigating to preview URL: ${previewUrl.replace(/\?token=[^&]+/, '?token=***')}`);
      
      // Use the new preview page that renders ModernResumePreview
      // Note: The preview page should handle authentication via localStorage or query token
      const response = await page.goto(previewUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      if (!response || !response.ok()) {
        const status = response?.status() || 'unknown';
        throw new Error(`Failed to load preview page: HTTP ${status}`);
      }

      this.logger.debug('Preview page loaded, waiting for resumeReady signal...');

      // Wait for resume to be fully loaded (signal from frontend)
      try {
        await page.waitForFunction(() => {
          return (window as any).resumeReady === true;
        }, { timeout: 15000 });
        this.logger.debug('Resume ready signal received');
      } catch (waitError) {
        this.logger.warn('Resume ready signal timeout, proceeding anyway...');
        // Continue anyway, the page might still be ready
      }

      // Additional wait to ensure all fonts and styles are loaded
      await new Promise(resolve => setTimeout(resolve, 2000));

      this.logger.debug('Generating PDF...');

      // Generate PDF with exact A4 dimensions
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        scale: 0.5, // Scale down the 2x viewport to normal size for crisp rendering
      });

      this.logger.debug(`PDF generated, size: ${pdfBuffer.length} bytes`);

      await browser.close();
      browser = null;

      // Persist PDF via the storage abstraction and return its storage key.
      const key = `resumes/${resume._id}/${Date.now()}.pdf`;
      await this.storageService.put(key, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
      });
      this.logger.debug(`PDF saved to storage key: ${key}`);

      return key;
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          this.logger.error('Error closing browser:', closeError);
        }
      }
      
      this.logger.error('Error generating PDF:', error);
      this.logger.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      throw new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    const resume = await this.findOne(id, userId);

    if (resume.pdfPath) {
      try {
        await this.storageService.delete(resume.pdfPath);
      } catch (error) {
        this.logger.warn(`Failed to delete PDF object: ${resume.pdfPath}`, error);
      }
    }

    await this.resumeModel.deleteOne({ _id: id }).exec();
  }

  async getPDFPath(id: string, userId: string): Promise<string> {
    const resume = await this.findOne(id, userId);

    if (!resume.pdfPath) {
      const pdfPath = await this.generatePDF(resume);
      resume.pdfPath = pdfPath;
      resume.pdfUrl = `/api/resume-builder/${resume._id}/pdf`;
      await resume.save();
    }

    return resume.pdfPath;
  }

  /**
   * Full inline PDF work: render via Puppeteer, persist the storage key + pdfUrl
   * on the resume doc, and save. Called directly by the inline fallback and by
   * the Bull processor when queues are enabled.
   */
  async generateAndPersistPdf(
    resumeId: string,
    userId: string,
  ): Promise<{ pdfUrl: string; pdfPath: string }> {
    const resume = await this.findOne(resumeId, userId);
    const pdfPath = await this.generatePDF(resume, userId);
    resume.pdfPath = pdfPath;
    resume.pdfUrl = `/api/resume-builder/${resume._id}/pdf`;
    await resume.save();
    return { pdfUrl: resume.pdfUrl, pdfPath };
  }

  /**
   * Producer for the `POST :id/generate-pdf` route.
   * - Queue registered (QUEUE_ENABLED=true) → enqueue and return { queued, jobId }.
   *   The processor persists pdfPath/pdfUrl; the frontend keeps polling GET :id/pdf.
   * - No queue (@Optional undefined, dev default) → run inline, identical to before.
   */
  async requestPdfGeneration(
    resumeId: string,
    userId: string,
  ): Promise<{ queued: boolean; jobId?: string | number; pdfUrl?: string; message: string }> {
    if (this.pdfQueue) {
      const job = await this.pdfQueue.add(JOB_GENERATE_PDF, { resumeId, userId });
      return { queued: true, jobId: job.id, message: 'PDF generation queued' };
    }
    const { pdfUrl } = await this.generateAndPersistPdf(resumeId, userId);
    return { queued: false, pdfUrl, message: 'PDF generated successfully' };
  }
}

