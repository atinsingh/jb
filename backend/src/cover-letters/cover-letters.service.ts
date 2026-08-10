import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CoverLetter, CoverLetterDocument } from '../schemas/cover-letter.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { StorageService } from '../storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class CoverLettersService {
  private readonly logger = new Logger(CoverLettersService.name);

  constructor(
    @InjectModel(CoverLetter.name)
    private coverLetterModel: Model<CoverLetterDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly llmRoutingService: LLMRoutingService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(userId: string): Promise<CoverLetterDocument[]> {
    return this.coverLetterModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string): Promise<CoverLetterDocument> {
    const coverLetter = await this.coverLetterModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!coverLetter) {
      throw new NotFoundException('Cover letter not found');
    }

    return coverLetter;
  }

  async generate(
    userId: string,
    generateDto: GenerateCoverLetterDto,
  ): Promise<CoverLetterDocument> {
    // Get user information
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prepare candidate info for AI
    const candidateInfo = {
      name: user.name || 'Candidate',
      skills: user.skills || [],
      experience: user.experience || [],
      summary: user.summary || '',
    };

    // Prepare job info
    const jobInfo = {
      title: generateDto.jobTitle,
      companyName: generateDto.companyName,
      description: generateDto.jobDescription,
      additionalInfo: generateDto.additionalInfo,
    };

    // Generate cover letter with AI based on template
    const coverLetterContent = await this.generateCoverLetterWithTemplate(
      candidateInfo,
      jobInfo,
      generateDto.template,
    );

    // Create cover letter document
    const coverLetter = new this.coverLetterModel({
      userId: new Types.ObjectId(userId),
      jobTitle: generateDto.jobTitle,
      companyName: generateDto.companyName,
      jobDescription: generateDto.jobDescription,
      additionalInfo: generateDto.additionalInfo,
      template: generateDto.template,
      content: coverLetterContent,
    });

    const savedLetter = await coverLetter.save();

    // Generate PDF
    try {
      const pdfPath = await this.generatePDF(savedLetter, user);
      savedLetter.pdfPath = pdfPath;
      savedLetter.pdfUrl = `/api/cover-letters/${savedLetter._id}/pdf`;
      await savedLetter.save();
    } catch (error) {
      this.logger.error('Error generating PDF, but cover letter saved:', error);
      // Continue even if PDF generation fails - user can regenerate later
    }

    return savedLetter;
  }

  private async generateCoverLetterWithTemplate(
    candidateInfo: any,
    jobInfo: any,
    template: string,
  ): Promise<string> {
    const templatePrompts = {
      professional: `Generate a professional, formal cover letter for this candidate applying to this job. Use a traditional business letter format with formal language.

Candidate:
- Name: ${candidateInfo.name}
- Skills: ${candidateInfo.skills.join(', ')}
- Experience: ${JSON.stringify(candidateInfo.experience)}
- Summary: ${candidateInfo.summary}

Job:
- Title: ${jobInfo.title}
- Company: ${jobInfo.companyName}
- Description: ${jobInfo.description}
${jobInfo.additionalInfo ? `- Additional Info: ${jobInfo.additionalInfo}` : ''}

Write a compelling, professional cover letter (300-400 words) in a formal tone suitable for corporate positions.`,

      modern: `Generate a modern, engaging cover letter for this candidate applying to this job. Use a contemporary, friendly tone while remaining professional.

Candidate:
- Name: ${candidateInfo.name}
- Skills: ${candidateInfo.skills.join(', ')}
- Experience: ${JSON.stringify(candidateInfo.experience)}
- Summary: ${candidateInfo.summary}

Job:
- Title: ${jobInfo.title}
- Company: ${jobInfo.companyName}
- Description: ${jobInfo.description}
${jobInfo.additionalInfo ? `- Additional Info: ${jobInfo.additionalInfo}` : ''}

Write a compelling, modern cover letter (300-400 words) with a contemporary tone, great for tech and creative roles.`,

      concise: `Generate a concise, impactful cover letter for this candidate applying to this job. Keep it short and to the point while highlighting key qualifications.

Candidate:
- Name: ${candidateInfo.name}
- Skills: ${candidateInfo.skills.join(', ')}
- Experience: ${JSON.stringify(candidateInfo.experience)}
- Summary: ${candidateInfo.summary}

Job:
- Title: ${jobInfo.title}
- Company: ${jobInfo.companyName}
- Description: ${jobInfo.description}
${jobInfo.additionalInfo ? `- Additional Info: ${jobInfo.additionalInfo}` : ''}

Write a concise cover letter (200-300 words) that's short, impactful, and perfect for busy recruiters.`,

      enthusiastic: `Generate an enthusiastic, energetic cover letter for this candidate applying to this job. Show passion and excitement while remaining professional.

Candidate:
- Name: ${candidateInfo.name}
- Skills: ${candidateInfo.skills.join(', ')}
- Experience: ${JSON.stringify(candidateInfo.experience)}
- Summary: ${candidateInfo.summary}

Job:
- Title: ${jobInfo.title}
- Company: ${jobInfo.companyName}
- Description: ${jobInfo.description}
${jobInfo.additionalInfo ? `- Additional Info: ${jobInfo.additionalInfo}` : ''}

Write an enthusiastic cover letter (300-400 words) with an energetic, passionate tone, ideal for startup culture.`,

      storytelling: `Generate a narrative-driven cover letter for this candidate applying to this job. Tell a story that connects the candidate's journey to the role.

Candidate:
- Name: ${candidateInfo.name}
- Skills: ${candidateInfo.skills.join(', ')}
- Experience: ${JSON.stringify(candidateInfo.experience)}
- Summary: ${candidateInfo.summary}

Job:
- Title: ${jobInfo.title}
- Company: ${jobInfo.companyName}
- Description: ${jobInfo.description}
${jobInfo.additionalInfo ? `- Additional Info: ${jobInfo.additionalInfo}` : ''}

Write a storytelling cover letter (300-400 words) that narrates the candidate's journey and connects it to the role.`,
    };

    const prompt = templatePrompts[template] || templatePrompts.professional;

    try {
      // Route through the modern llm/ stack. `getProviderForFeature` returns the
      // configured provider (or MockProvider when no API key is present), so the
      // template prompts run against the same primitive the feature-services use.
      const provider = this.llmRoutingService.getProviderForFeature(
        LLMFeature.GENERATE_COVER_LETTER,
      );
      const config = this.llmRoutingService.getFeatureConfig(
        LLMFeature.GENERATE_COVER_LETTER,
      );

      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content: `You are a professional cover letter writer. Generate cover letters based on the template style requested. Return only the cover letter content, no additional text or explanations.`,
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

      // No content returned — degrade to the local template.
      return this.composeFallbackCoverLetter(candidateInfo, jobInfo);
    } catch (error) {
      this.logger.error(
        'AI cover letter generation failed, using local template fallback:',
        error?.message || error,
      );
      // Graceful degradation: compose a usable letter locally instead of 500ing
      return this.composeFallbackCoverLetter(candidateInfo, jobInfo);
    }
  }

  private composeFallbackCoverLetter(candidateInfo: any, jobInfo: any): string {
    const name = candidateInfo?.name || 'Candidate';
    const skills = Array.isArray(candidateInfo?.skills) ? candidateInfo.skills : [];
    const summary = candidateInfo?.summary || '';
    const title = jobInfo?.title || 'the open role';
    const company = jobInfo?.companyName || 'your company';
    const skillsLine = skills.length
      ? `My background spans ${skills.slice(0, 6).join(', ')}, which maps directly to what this role requires.`
      : 'My background and hands-on experience map directly to what this role requires.';
    const summaryLine = summary ? ` ${summary}` : '';

    return [
      `Dear Hiring Team at ${company},`,
      '',
      `I am writing to express my strong interest in the ${title} position at ${company}. ` +
        `After reviewing the role, I am confident that my experience and drive make me a great fit.${summaryLine}`,
      '',
      `${skillsLine} I take ownership of my work, collaborate well across teams, and consistently deliver results that move the business forward.`,
      '',
      `I would welcome the opportunity to discuss how I can contribute to ${company}. Thank you for your time and consideration.`,
      '',
      'Sincerely,',
      name,
    ].join('\n');
  }

  private async generatePDF(
    coverLetter: CoverLetterDocument,
    user: UserDocument,
  ): Promise<string> {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 72;
      const pageWidth = 612;
      const pageHeight = 792;
      let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;

      // Header
      currentPage.drawText(user.name || 'Your Name', {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;

      // Date
      const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      currentPage.drawText(today, {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });

      yPosition -= 30;

      // Company info
      currentPage.drawText(coverLetter.companyName, {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;

      // Greeting
      currentPage.drawText('Dear Hiring Manager,', {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= 30;

      // Cover letter content
      const lines = this.splitTextIntoLines(coverLetter.content, 70);
      const lineHeight = 14;
      const pageBottom = margin + 50;

      for (const line of lines) {
        if (yPosition < pageBottom) {
          // Add new page if needed
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        });

        yPosition -= lineHeight;
      }

      // Signature
      yPosition -= 30;
      if (yPosition < pageBottom) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      currentPage.drawText('Sincerely,', {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
      currentPage.drawText(user.name || 'Your Name', {
        x: margin,
        y: yPosition,
        size: 10,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Persist PDF via the storage abstraction and return its storage key.
      const pdfBytes = await pdfDoc.save();
      const key = `cover-letters/${coverLetter._id}.pdf`;
      await this.storageService.put(key, Buffer.from(pdfBytes), {
        contentType: 'application/pdf',
      });

      return key;
    } catch (error) {
      this.logger.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private splitTextIntoLines(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  async delete(id: string, userId: string): Promise<void> {
    const coverLetter = await this.findOne(id, userId);

    // Delete PDF object if exists
    if (coverLetter.pdfPath) {
      try {
        await this.storageService.delete(coverLetter.pdfPath);
      } catch (error) {
        this.logger.warn(`Failed to delete PDF object: ${coverLetter.pdfPath}`, error);
      }
    }

    await this.coverLetterModel.deleteOne({ _id: id }).exec();
  }

  async getPDFPath(id: string, userId: string): Promise<string> {
    const coverLetter = await this.findOne(id, userId);

    // If PDF doesn't exist, generate it
    if (!coverLetter.pdfPath) {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      const pdfPath = await this.generatePDF(coverLetter, user);
      coverLetter.pdfPath = pdfPath;
      coverLetter.pdfUrl = `/api/cover-letters/${coverLetter._id}/pdf`;
      await coverLetter.save();
    }

    return coverLetter.pdfPath;
  }
}

