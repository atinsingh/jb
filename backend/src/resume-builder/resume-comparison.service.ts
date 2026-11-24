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
import { absentAfterExtraction, ExtractedResume, groundResumeExtraction } from './resume-extraction';

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
    const normalizeJob = (value?: string) => (value || '').replace(/\r\n/g, '\n').trim();
    const jobDescription = normalizeJob(resume.source?.jobDescription);
    if (!review?.result || (jobDescription && normalizeJob(review.jobText) !== jobDescription)) {
      throw new BadRequestException('Compare this résumé against the current job before generating a corrected version.');
    }
    const alias = await this.aliases.resolveAutomaticForUser(userId);
    const jobUrl = resume.source?.jobUrl?.trim();
    const session = await this.harness.startSession(userId, {
      model: alias.model,
      effort: alias.effort,
      ...(templateKey?.trim() ? { templateKey: templateKey.trim() } : {}),
      ...(resume.name?.trim() ? { targetRole: resume.name.trim() } : {}),
      ...(jobDescription ? { jobDescription } : {}),
      ...(!jobDescription && jobUrl ? { jobUrl } : {}),
      candidateFacts: await this.correctionFacts(resume, resumeId, userId, review.result.extracted),
    });
    return {
      session,
      instruction: correctionInstruction(review.result.annotations || []),
    };
  }

  /** Saved résumé fields, overlaid with the review's grounded extraction unless user-edited. */
  private async correctionFacts(resume: Resume, resumeId: string, userId: string, rawExtracted: unknown): Promise<string> {
    const facts: Record<string, any> = {
      fullName: resume.fullName,
      email: resume.email,
      phone: resume.phone,
      location: resume.location,
      linkedin: resume.linkedin,
      github: resume.github,
      website: resume.website,
      headline: resume.headline,
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
      projects: resume.projects,
      achievements: resume.achievements,
      certifications: resume.certifications,
      languages: resume.languages,
      customSections: resume.customSections,
    };
    let source = this.resumeText(resume);
    if (resume.source?.storageKey) {
      try {
        source = (await this.comparisonText(resume, resumeId, userId)).text;
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('The original résumé could not be read, so a corrected version was not started.');
      }
    }
    const extracted = groundResumeExtraction(rawExtracted, source);
    const userEdited = resume.source?.parseStatus === 'user_edited';
    this.applyExtracted(facts, extracted, { overwrite: !userEdited });
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
    // An original file's headings are equated by the review agent. Alias matching
    // treated "Engineering Description" as a missing summary and saved that gap.
    const missingSections = originalFile
      ? []
      : (['summary', 'experience', 'skills', 'education', 'achievements'] as const)
        .filter((section) => !structured[section] || Array.isArray(structured[section]) && structured[section].length === 0);
    const details: Record<string, unknown> = {};
    const aiContent = this.aiContent.analyze(text);
    // Score the original upload, never partially parsed or subsequently edited fields.
    const ats = this.ats.check(originalFile ? { text } : { structured });
    const match = this.matcher.match(originalFile ? text : structured, targetText);
    const started = await this.agentReview.beginReview({
      userId, resumeId, resumeText: text, originalFile, jobDescription: targetText, missingSections,
    }, { forceRefresh: input.forceRefresh === true });
    const annotations = this.localAnnotations(text, ats, match);
    let resolvedMissingSections: string[] = [...missingSections];
    if ('result' in started) {
      annotations.push(...this.groundedAnnotations(started.result.annotations, text));
      const extracted = groundResumeExtraction(started.result.extracted, text);
      if (originalFile) {
        resolvedMissingSections = absentAfterExtraction(started.result.absentSections, extracted);
      }
      const applied = this.applyExtractedToDocument(resume, extracted, resolvedMissingSections);
      Object.assign(details, applied);
      if (Object.keys(applied).length) await resume.save();
    }
    const sectionNotice = resolvedMissingSections.length
      ? `Missing sections: ${resolvedMissingSections.map((section) => section[0].toUpperCase() + section.slice(1)).join(', ')}.`
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
        missingSections: resolvedMissingSections,
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
    const extracted = groundResumeExtraction(session.result.extracted, text);
    const missingSections = absentAfterExtraction(session.result.absentSections, extracted);
    const details = this.applyExtractedToDocument(resume, extracted, missingSections);
    if (Object.keys(details).length) await resume.save();
    return {
      status: 'completed' as const,
      annotations: [
        ...this.localAnnotations(text, ats, match),
        ...this.groundedAnnotations(session.result.annotations, text),
      ],
      details,
      missingSections,
    };
  }

  private applyExtracted(
    target: Record<string, any>,
    extracted: ExtractedResume,
    options: { overwrite: boolean },
  ): Record<string, unknown> {
    const details: Record<string, unknown> = {};
    for (const field of EXTRACTED_FIELDS) {
      const value = extracted[field];
      const usable = (typeof value === 'string' && value.trim().length > 0)
        || (Array.isArray(value) && value.length > 0);
      if (!usable) continue;
      const current = target[field];
      const empty = isBlank(current);
      if (!options.overwrite && !empty) continue;
      if (!empty && sameJsonValue(current, value)) continue;
      target[field] = value;
      details[field] = value;
    }
    return details;
  }

  private applyExtractedToDocument(
    resume: ResumeDocument,
    extracted: ExtractedResume,
    absentSections: string[],
  ): Record<string, unknown> {
    if (resume.source?.parseStatus === 'user_edited') return {};
    const wasHeuristic = resume.source?.parseStatus === 'partial';
    const details = this.applyExtracted(resume as unknown as Record<string, any>, extracted, { overwrite: true });
    if (wasHeuristic && absentSections.length) {
      for (const section of absentSections) {
        if (section in details) continue;
        const current = (resume as any)[section];
        if (isBlank(current)) continue;
        const cleared = section === 'summary' ? '' : [];
        (resume as any)[section] = cleared;
        details[section] = cleared;
      }
    }
    if (Object.keys(details).length) {
      if (resume.source) {
        resume.source = { ...resume.source, parseStatus: 'parsed' };
        (resume as any).markModified?.('source');
      }
      if ('customSections' in details) {
        (resume as any).markModified?.('customSections');
      }
    }
    return details;
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

  async waitBites(resumeId: string, userId: string) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    let source = biteSource(resume);
    if (!source && resume.source?.storageKey) {
      try {
        source = (await this.comparisonText(resume, resumeId, userId)).text
          .split(/\r?\n/)
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .filter((line) => line.length >= 12 && !isHeaderLine(line))
          .slice(0, 24)
          .join('\n');
      } catch {
        source = '';
      }
    }
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
      const grounded = groundedBites(response.content, source);
      return { bites: grounded.length ? grounded : localBites(resume, source) };
    } catch {
      return { bites: localBites(resume, source) };
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

const EXTRACTED_FIELDS = [
  'fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'website', 'headline',
  'summary', 'skills', 'experience', 'education', 'achievements', 'certifications',
  'projects', 'languages', 'customSections',
] as const;

function plainValue(value: unknown, seen?: Set<unknown>): unknown {
  if (value == null || typeof value !== 'object') return value;
  const visiting = seen ?? new Set<unknown>();
  if (visiting.has(value)) return undefined;
  visiting.add(value);
  const doc = value as { toObject?: () => unknown };
  if (typeof doc.toObject === 'function') {
    const plain = doc.toObject();
    if (plain !== value) return plainValue(plain, visiting);
  }
  if (Array.isArray(value)) return value.map((item) => plainValue(item, visiting));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k === '_id' || k === '__v') continue;
    const mapped = plainValue(v, visiting);
    if (mapped !== undefined) out[k] = mapped;
  }
  return out;
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(plainValue(left)) === JSON.stringify(plainValue(right));
  } catch {
    return false;
  }
}

function isBlank(value: unknown, seen?: Set<unknown>): boolean {
  if (value == null || value === '') return true;
  if (typeof value === 'string') return !value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return false;
  if (typeof value !== 'object') return false;
  const visiting = seen ?? new Set<unknown>();
  // Mongoose parent links point back at the same list.
  if (visiting.has(value)) return true;
  visiting.add(value);
  const doc = value as { toObject?: () => unknown };
  if (typeof doc.toObject === 'function') {
    const plain = doc.toObject();
    if (plain !== value) return isBlank(plain, visiting);
  }
  if (Array.isArray(value)) return value.length === 0 || value.every((item) => isBlank(item, visiting));
  return Object.values(value).every((item) => isBlank(item, visiting));
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
    const role = [job.title, job.company].filter(Boolean).join(' at ');
    if (!isHeaderLine(role)) push(role);
    push(job.description);
    (job.achievements || []).forEach(push);
  });
  ((resume as { achievements?: string[] }).achievements || []).forEach(push);
  return lines.join('\n');
}

const BITE_STOP = new Set<string>(['at', 'as', 'an', 'or', 'of', 'to', 'in', 'on', 'for', 'and', 'the', 'with', 'from', 'your']);

function isHeaderLine(text: string) {
  return /location:|client:|duration:|responsibilities:/i.test(text);
}

function localBites(resume: Resume, rawText = '') {
  const facts: Array<{ label: string; detail: string }> = [];
  const add = (label: string, detail: string) => {
    const name = label.replace(/\s+/g, ' ').trim();
    const more = detail.replace(/\s+/g, ' ').trim();
    if (!name || !more || isHeaderLine(name) || facts.some((fact) => fact.label === name)) return;
    facts.push({ label: name, detail: more });
  };
  (resume.experience || []).forEach((job) => {
    (job.achievements || []).forEach((item) => {
      const text = String(item || '').replace(/\s+/g, ' ').trim();
      if (text.length >= 20) add(text, text);
    });
    const role = [job.title, job.company].filter(Boolean).join(' at ');
    const detail = String(job.description || '').replace(/\s+/g, ' ').trim();
    if (role && detail) add(role, detail);
  });
  (resume.skills || []).forEach((skill) => {
    const name = String(skill || '').replace(/\s+/g, ' ').trim();
    if (name) add(name, name);
  });
  if (!facts.length && rawText) {
    for (const line of rawText.split(/\r?\n/)) {
      const text = line.replace(/^[\u0088•·▪◦‣∙*-]\s*/, '').replace(/\s+/g, ' ').trim();
      if (text.length >= 20 && !/\S+@\S+/.test(text)) add(text, text);
    }
  }
  return facts.slice(0, 8);
}

function biteWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9+#\s-]/g, ' ').split(/\s+/)
    .filter((word) => word.length >= 2 && !BITE_STOP.has(word));
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
  const clean = (value?: string) => String(value || '').replace(/\s+/g, ' ').trim();
  return (parsed?.bites || []).flatMap((bite) => {
    const label = clean(bite?.label);
    const detail = clean(bite?.detail);
    if (!label || !detail || isHeaderLine(label) || isHeaderLine(detail)) return [];
    const blob = `${label} ${detail}`;
    const numbers = blob.match(/\d+/g) || [];
    if (numbers.some((number) => !sourceNumbers.has(number))) return [];
    const significant = biteWords(blob);
    if (!significant.length || significant.some((word) => !sourceWords.has(word))) return [];
    return [{ label, detail }];
  }).slice(0, 8);
}
