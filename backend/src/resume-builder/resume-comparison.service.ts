import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtsSeverity } from '../ats/ats.types';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsMatchService } from '../ats/ats-match.service';
import { AI_CONTENT_HEURISTIC_CONFIG, ResumeAiContentHeuristicService } from '../employer-pipeline/resume-ai-content-heuristic.service';
import { Resume, ResumeDocument } from '../schemas/resume.schema';
import { JobDescriptionResolverService } from '../resume-harness/job-description-resolver.service';
import { ResumeParserService } from '../resume/resume-parser.service';
import { StorageService } from '../storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { CandidateResumeReviewAgent } from './candidate-resume-review.agent';

export type ResumeComparisonAnnotation = {
  id: string;
  section: 'personal' | 'summary' | 'experience' | 'skills' | 'education' | 'projects' | 'achievements' | 'certifications' | 'languages';
  severity: AtsSeverity;
  color: 'red' | 'amber' | 'blue';
  message: string;
  fix: string;
  quote?: string;
};

@Injectable()
export class ResumeComparisonService {
  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    private readonly aiContent: ResumeAiContentHeuristicService,
    private readonly jobDescriptions: JobDescriptionResolverService,
    private readonly storage: StorageService,
    private readonly parser: ResumeParserService,
    private readonly ats: AtsParseabilityService,
    private readonly matcher: AtsMatchService,
    private readonly agentReview: CandidateResumeReviewAgent,
  ) {}

  async attachSource(resumeId: string, userId: string, file: Express.Multer.File) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.creationMethod !== 'imported') {
      throw new BadRequestException('Only imported resumes can retain a source file.');
    }
    const extension = extname(file.originalname).toLowerCase();
    if (!['.pdf', '.doc', '.docx'].includes(extension)) {
      throw new BadRequestException('Only PDF, DOC, and DOCX files are supported.');
    }
    const mimeType = extension === '.pdf'
      ? 'application/pdf'
      : extension === '.docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/msword';
    const key = `resumes/compare/${userId}/${randomUUID()}${extension}`;
    await this.storage.put(key, file.buffer, { contentType: mimeType });
    resume.source = {
      ...(resume.source || {}),
      originalFilename: file.originalname,
      fileExtension: extension,
      mimeType,
      fileSize: file.size,
      storageKey: key,
    };
    await resume.save();
    return { filename: file.originalname };
  }

  async getSource(resumeId: string, userId: string) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    if (!resume.source?.storageKey) throw new NotFoundException('Source file not found');
    if (!resume.source.storageKey.startsWith(`resumes/compare/${userId}/`)) {
      throw new NotFoundException('Source file not found');
    }
    return {
      buffer: await this.storage.getBuffer(resume.source.storageKey),
      mimeType: resume.source.mimeType || 'application/octet-stream',
      filename: resume.source.originalFilename || 'resume',
    };
  }

  async compare(
    resumeId: string,
    userId: string,
    input: { jobDescription?: string; jobUrl?: string; forceRefresh?: boolean },
  ) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    if (!['imported', 'ai_rewrite'].includes(resume.creationMethod || '')) {
      throw new BadRequestException('Compare Resume is available for imported resumes.');
    }

    const structured = resume.toObject ? resume.toObject() : resume;
    const jobDescription = Object.prototype.hasOwnProperty.call(input, 'jobDescription')
      ? input.jobDescription?.trim()
      : structured.source?.jobDescription?.trim();
    const jobUrl = Object.prototype.hasOwnProperty.call(input, 'jobUrl')
      ? input.jobUrl?.trim()
      : structured.source?.jobUrl?.trim();
    if (!jobDescription && !jobUrl) {
      throw new BadRequestException('A job description or job URL is required to compare.');
    }
    const resolved = jobDescription ? undefined : await this.jobDescriptions.resolve(jobUrl!);
    const targetText = jobDescription || resolved?.description;
    if (!targetText) {
      throw new BadRequestException(resolved?.warning || 'Could not read the job URL. Paste the job description.');
    }
    const { text, originalFile } = await this.comparisonText(structured as Resume, resumeId, userId);
    const missingSections = originalFile
      ? this.missingCoreSections(text)
      : (['summary', 'experience', 'skills', 'education', 'achievements'] as const)
        .filter((section) => !structured[section] || Array.isArray(structured[section]) && structured[section].length === 0);
    const details: Record<string, unknown> = {};
    if (originalFile) {
      const extracted = this.parser.heuristicParse(text);
      for (const field of ['fullName', 'summary', 'experience', 'skills', 'education', 'achievements', 'certifications'] as const) {
        const current = resume[field];
        const value = extracted[field];
        if ((current == null || current === '' || Array.isArray(current) && current.length === 0)
          && (typeof value === 'string' && value.trim() || Array.isArray(value) && value.length)) {
          (resume as any)[field] = value;
          details[field] = value;
        }
      }
      if (Object.keys(details).length) await resume.save();
    }
    const aiContent = this.aiContent.analyze(text);
    // Score the original upload, never partially parsed or subsequently edited fields.
    const ats = this.ats.check(originalFile ? { text } : { structured });
    const match = this.matcher.match(originalFile ? text : structured, targetText);
    const review = await this.agentReview.review({
      userId, resumeId, resumeText: text, originalFile, jobDescription: targetText, missingSections,
    }, { forceRefresh: input.forceRefresh === true });
    const annotations: ResumeComparisonAnnotation[] = ats.findings.map((finding) => ({
      id: finding.code,
      section: finding.code.includes('EXPERIENCE') ? 'experience'
        : finding.code.includes('EDUCATION') ? 'education'
        : finding.code.includes('SKILL') ? 'skills'
        : finding.code.includes('EMAIL') || finding.code.includes('PHONE') ? 'personal' : 'summary',
      severity: finding.severity,
      color: finding.severity === 'critical' ? 'red' : finding.severity === 'warning' ? 'amber' : 'blue',
      message: finding.message,
      fix: finding.fix,
    }));
    if (match.missing.length) annotations.push({
      id: 'missing-job-skills', section: 'skills', severity: 'warning', color: 'amber',
      message: `Job requirements not found in this resume: ${match.missing.join(', ')}.`,
      fix: 'Add relevant examples only for skills you have used.',
    });
    for (const phrase of AI_CONTENT_HEURISTIC_CONFIG.stockPhrases) {
      const start = text.toLowerCase().indexOf(phrase);
      if (start < 0) continue;
      annotations.push({
        id: `stock-${phrase.replace(/\s+/g, '-')}`, section: 'summary', severity: 'info', color: 'blue',
        quote: text.slice(start, start + phrase.length),
        message: 'This phrase is generic.',
        fix: 'Replace it with a specific example of your work and its outcome.',
      });
    }
    annotations.push(...this.groundedAnnotations(review.annotations, text));
    const sectionNotice = missingSections.length
      ? `Missing sections: ${missingSections.map((section) => section[0].toUpperCase() + section.slice(1)).join(', ')}.`
      : '';

    // ponytail: retain 500 runs per resume; use a separate activity collection if longer retention is needed.
    await this.resumeModel.updateOne(
      { _id: resumeId, userId: new Types.ObjectId(userId) },
      { $push: { comparisonHistory: { $each: [{
        at: new Date(), atsScore: ats.score, jobMatchScore: match.coverage, contentScore: aiContent.composite,
      }], $slice: -500 } } },
    );

    return {
      resumeId,
      ats: {
        ...ats,
        explanation: `${ats.score}% document compatibility, based on readable text, contact details, section headings, dates, and length. ${sectionNotice}`.trim(),
        missingSections,
      },
      match: {
        ...match,
        explanation: match.keywordCount
          ? `${match.coverage}%: ${match.matched.length} of ${match.keywordCount} recognized job skills found in the resume.${match.missing.length ? ` Missing: ${match.missing.join(', ')}.` : ''}`
          : '0%: no recognized job skills found in the job description to compare.',
      },
      aiContent,
      review: { source: review.source, sessionId: review.sessionId, harness: review.harness, modelAlias: review.modelAlias },
      annotations,
      details,
    };
  }

  private groundedAnnotations(items: ResumeComparisonAnnotation[], text: string) {
    const comparable = (value: string) => String(value || '').normalize('NFKD').toLowerCase()
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
    const haystack = comparable(text);
    return (Array.isArray(items) ? items : []).filter(item =>
      item.quote && comparable(item.quote).length >= 4 && haystack.includes(comparable(item.quote))
      && item.message?.trim() && item.fix?.trim(),
    ).map(item => ({ ...item, color: item.severity === 'critical' ? 'red' as const
      : item.severity === 'warning' ? 'amber' as const : 'blue' as const }));
  }

  private missingCoreSections(text: string): string[] {
    const headings = new Set(text.split(/\r?\n/).map((line) => line.trim().toLowerCase().replace(/[:\s]+$/, '')));
    const aliases: Record<string, string[]> = {
      summary: ['summary', 'professional summary', 'profile', 'profile summary', 'about me'],
      experience: ['experience', 'work experience', 'professional experience', 'employment history'],
      skills: ['skills', 'technical skills', 'core skills', 'key skills', 'core competencies'],
      education: ['education', 'academic background', 'academics'],
      achievements: ['achievements', 'other initiatives and achievements', 'accomplishments', 'awards', 'honors', 'honours'],
    };
    return Object.entries(aliases).filter(([, names]) => !names.some((name) => headings.has(name))).map(([section]) => section);
  }

  private resumeText(resume: Resume): string {
    const parts: string[] = [];
    const walk = (value: any) => {
      if (value == null) return;
      if (typeof value === 'string' || typeof value === 'number') parts.push(String(value));
      else if (Array.isArray(value)) value.forEach(walk);
      else if (typeof value === 'object') Object.values(value).forEach(walk);
    };
    walk({
      fullName: resume.fullName,
      email: resume.email,
      phone: resume.phone,
      location: resume.location,
      linkedin: resume.linkedin,
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
      projects: (resume as any).projects,
      achievements: (resume as any).achievements,
      certifications: resume.certifications,
      languages: (resume as any).languages,
      customSections: (resume as any).customSections,
    });
    return parts.join('\n');
  }

  private async comparisonText(resume: Resume, resumeId: string, userId: string) {
    if (!resume.source?.storageKey) return { text: this.resumeText(resume) };
    const source = await this.getSource(resumeId, userId);
    if (!/\.(pdf|docx)$/i.test(source.filename)) {
      throw new BadRequestException('This source format cannot be reliably extracted for comparison. Upload a PDF or DOCX.');
    }
    const text = await this.parser.extractText({
      originalname: source.filename,
      buffer: source.buffer,
    } as Express.Multer.File);
    if (text.trim().length < 30) {
      throw new BadRequestException('The original resume contains too little selectable text to compare. Upload a text-based PDF or DOCX.');
    }
    return { text, originalFile: { filename: source.filename, bytes: source.buffer } };
  }

}
