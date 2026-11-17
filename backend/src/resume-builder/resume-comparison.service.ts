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
import { LLMFeature, LLMRoutingService } from '../llm/llm-routing.service';
import { CandidateAtsReviewSession, CandidateAtsReviewSessionDocument } from './schemas/candidate-ats-review-session.schema';
import { ResumeHarnessService } from '../resume-harness/resume-harness.service';
import { ModelAliasService } from '../resume-harness/model-alias.service';
import { correctionInstruction, importedResumeFacts } from './compare-correction';

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
    private readonly harness: ResumeHarnessService,
    private readonly aliases: ModelAliasService,
    @InjectModel(CandidateAtsReviewSession.name)
    private readonly reviews: Model<CandidateAtsReviewSessionDocument>,
    private readonly llm: LLMRoutingService,
  ) {}

  async prepareCorrection(resumeId: string, userId: string, templateKey?: string) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.creationMethod !== 'imported') {
      throw new BadRequestException('Only an imported résumé can be corrected from a comparison.');
    }
    const review = await this.reviews
      .findOne({ userId: new Types.ObjectId(userId), resumeId, status: 'completed' })
      .sort({ createdAt: -1 })
      .exec();
    if (!review?.result) {
      throw new BadRequestException('Compare this résumé before generating a corrected version.');
    }
    const alias = await this.aliases.resolveAutomaticForUser(userId);
    const jobDescription = resume.source?.jobDescription?.trim();
    const jobUrl = resume.source?.jobUrl?.trim();
    const session = await this.harness.startSession(userId, {
      model: alias.model,
      effort: alias.effort,
      ...(templateKey?.trim() ? { templateKey: templateKey.trim() } : {}),
      ...(resume.name?.trim() ? { targetRole: resume.name.trim() } : {}),
      ...(jobDescription ? { jobDescription } : {}),
      ...(!jobDescription && jobUrl ? { jobUrl } : {}),
      candidateFacts: await this.correctionFacts(resume, resumeId, userId),
    });
    return {
      session,
      instruction: correctionInstruction(review.result.annotations || []),
    };
  }

  /** Saved résumé fields, with blanks filled from the original file. */
  private async correctionFacts(resume: Resume, resumeId: string, userId: string): Promise<string> {
    const facts = {
      fullName: resume.fullName,
      email: resume.email,
      phone: resume.phone,
      location: resume.location,
      linkedin: resume.linkedin,
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
      projects: resume.projects,
      achievements: resume.achievements,
      certifications: resume.certifications,
    };
    if (resume.source?.storageKey) {
      try {
        const { text } = await this.comparisonText(resume, resumeId, userId);
        const extracted = this.parser.heuristicParse(text) as Record<string, any>;
        for (const field of ['fullName', 'email', 'phone', 'location', 'linkedin', 'summary', 'skills', 'experience', 'education', 'achievements', 'certifications', 'projects'] as const) {
          const value = field === 'fullName' ? extracted.fullName || extracted.name : extracted[field];
          const current = facts[field];
          const empty = current == null || current === '' || (Array.isArray(current) && current.length === 0);
          const usable = (typeof value === 'string' && value.trim()) || (Array.isArray(value) && value.length > 0);
          if (empty && usable) (facts as Record<string, unknown>)[field] = value;
        }
      } catch {
        // The saved résumé remains the source when the original file cannot be read.
      }
    }
    return importedResumeFacts(facts);
  }

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
    const started = await this.agentReview.beginReview({
      userId, resumeId, resumeText: text, originalFile, jobDescription: targetText, missingSections,
    }, { forceRefresh: input.forceRefresh === true });
    const annotations = this.localAnnotations(text, ats, match);
    if ('result' in started) annotations.push(...this.groundedAnnotations(started.result.annotations, text));
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
      pending: started.pending,
      review: 'result' in started
        ? { source: started.result.source, sessionId: started.result.sessionId, harness: started.result.harness, modelAlias: started.result.modelAlias }
        : { source: 'agent-session' as const, sessionId: started.sessionId },
      annotations,
      details,
    };
  }

  async reviewComments(resumeId: string, userId: string, sessionId: string) {
    const session = await this.reviews.findOne({
      _id: sessionId,
      resumeId,
      userId: new Types.ObjectId(userId),
    }).exec();
    if (!session) throw new NotFoundException('Review not found');
    if (session.status === 'failed') return { status: 'failed' as const, failureReason: session.failureReason };
    if (session.status !== 'completed' || !session.result) return { status: session.status };
    const resume = await this.resumeModel.findOne({ _id: resumeId, userId: new Types.ObjectId(userId) }).exec();
    if (!resume) throw new NotFoundException('Resume not found');
    const structured = resume.toObject ? resume.toObject() : resume;
    const jobText = session.jobText || structured.source?.jobDescription || '';
    const { text, originalFile } = await this.comparisonText(structured as Resume, resumeId, userId);
    const ats = this.ats.check(originalFile ? { text } : { structured });
    const match = jobText ? this.matcher.match(originalFile ? text : structured, jobText) : { missing: [] as string[] };
    return {
      status: 'completed' as const,
      annotations: [
        ...this.localAnnotations(text, ats, match),
        ...this.groundedAnnotations(session.result.annotations, text),
      ],
    };
  }

  private localAnnotations(text: string, ats: { findings: Array<{ code: string; severity: AtsSeverity; message: string; fix: string }> }, match: { missing: string[] }) {
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
    return annotations;
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

  async waitBites(resumeId: string, userId: string) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    const source = biteSource(resume);
    if (!source) return { bites: [] };
    try {
      // Owner routing already forces DEFAULT_AUTOMATIC_MODEL_ALIAS (Haiku). Do not pass a model.
      const provider = this.llm.getProviderForFeature(LLMFeature.REWRITE_BULLETS, userId);
      let timer: ReturnType<typeof setTimeout>;
      const response = await Promise.race([
        provider.chat({
          messages: [
            {
              role: 'system',
              content: 'Rewrite the résumé lines into short game bites. Return JSON {"bites":[{"label":"","detail":""}]}. Each label is under 8 words. Each detail is one sentence. Use only words, employers, tools, and numbers that appear in the lines. Do not add achievements.',
            },
            { role: 'user', content: source },
          ],
          temperature: 0.2,
          maxTokens: 400,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), 4000);
        }),
      ]).finally(() => clearTimeout(timer));
      return { bites: groundedBites(response.content, source) };
    } catch {
      return { bites: [] };
    }
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

function biteSource(resume: Resume): string {
  const lines: string[] = [];
  const push = (value?: string) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  };
  push(resume.summary);
  (resume.skills || []).forEach(push);
  (resume.experience || []).forEach((job) => {
    push([job.title, job.company].filter(Boolean).join(' at '));
    push(job.description);
    (job.achievements || []).forEach(push);
  });
  ((resume as { achievements?: string[] }).achievements || []).forEach(push);
  return lines.join('\n');
}

function biteWords(text: string) {
  return (text.toLowerCase().replace(/[^a-z0-9+#\s-]/g, ' ').match(/[a-z0-9][a-z0-9+#-]*/g) || []).filter((word) => word.length >= 4);
}

function groundedBites(raw: string, source: string) {
  const sourceWords = new Set(biteWords(source));
  const sourceNumbers = new Set(source.match(/\d+/g) || []);
  let parsed: { bites?: Array<{ label?: string; detail?: string }> };
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    parsed = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
  } catch {
    return [];
  }
  const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);
  return (parsed?.bites || []).flatMap((bite) => {
    const label = clip(String(bite?.label || '').replace(/\s+/g, ' ').trim(), 48);
    const detail = clip(String(bite?.detail || '').replace(/\s+/g, ' ').trim(), 160);
    if (!label || !detail) return [];
    const blob = `${label} ${detail}`;
    const numbers = blob.match(/\d+/g) || [];
    if (numbers.some((number) => !sourceNumbers.has(number))) return [];
    const significant = biteWords(blob);
    if (!significant.length || significant.some((word) => !sourceWords.has(word))) return [];
    return [{ label, detail }];
  }).slice(0, 8);
}
