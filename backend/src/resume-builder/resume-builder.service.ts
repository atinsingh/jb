import { Injectable, NotFoundException, Logger, ConflictException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { AiProviderService } from '../ai-services/ai-provider.service';
import { ResumeParserService } from '../resume/resume-parser.service';
import { ResumeService } from '../resume/resume.service';
import { CreateResumeDto, RegenerateSectionDto } from './dto/create-resume.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ResumeVersion, ResumeVersionDocument } from '../schemas/resume-version.schema';
import { ShareLink, ShareLinkDocument } from '../schemas/share-link.schema';
import { UpdateResumeDto, CreateShareLinkDto } from './dto/resume-operations.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ResumeBuilderService {
  private readonly logger = new Logger(ResumeBuilderService.name);
  private readonly uploadsDir = path.join(process.cwd(), 'uploads', 'resumes');

  constructor(
    @InjectModel(Resume.name)
    private resumeModel: Model<ResumeDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(ResumeVersion.name)
    private resumeVersionModel: Model<ResumeVersionDocument>,
    @InjectModel(ShareLink.name)
    private shareLinkModel: Model<ShareLinkDocument>,
    private aiProviderService: AiProviderService,
    private resumeParserService: ResumeParserService,
    private jwtService: JwtService,
  ) {
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create uploads directory:', error);
    }
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

    const resume = new this.resumeModel(resumeData);
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
    const parseResult = await this.resumeParserService.parseResume(file);

    // Create resume from parsed data
    const resume = new this.resumeModel({
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
    });

    return resume.save();
  }

  async update(id: string, userId: string, updates: Partial<Resume>): Promise<ResumeDocument> {
    const resume = await this.findOne(id, userId);

    // Prevent direct version manipulation via generic update
    delete updates.version;

    Object.assign(resume, updates);
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
      Object.assign(resume, updateDto.content);
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

    return this.resumeModel.findById(shareLink.resumeId).exec();
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
      const openai = (this.aiProviderService as any).openai;
      const anthropic = (this.aiProviderService as any).anthropic;
      const provider = (this.aiProviderService as any).provider || 'openai';

      let response: any;

      if (provider === 'openai' && openai) {
        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional resume writer. Generate optimized, ATS-friendly content for resume sections. Return only the content, no explanations.`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        if (response?.choices?.[0]?.message?.content) {
          return response.choices[0].message.content.trim();
        }
      } else if (provider === 'anthropic' && anthropic) {
        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `You are a professional resume writer. Generate optimized, ATS-friendly content for resume sections. Return only the content, no explanations.\n\n${prompt}`,
            },
          ],
        });

        if (response?.content?.[0]?.text) {
          return response.content[0].text.trim();
        }
      }

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

      // Save PDF
      const filename = `resume-${resume._id}-${Date.now()}.pdf`;
      const filepath = path.join(this.uploadsDir, filename);

      await fs.writeFile(filepath, pdfBuffer);
      this.logger.debug(`PDF saved to: ${filepath}`);

      return filepath;
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
        await fs.unlink(resume.pdfPath);
      } catch (error) {
        this.logger.warn(`Failed to delete PDF file: ${resume.pdfPath}`, error);
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
}

