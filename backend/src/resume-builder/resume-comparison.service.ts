import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AtsMatchService } from '../ats/ats-match.service';
import { AtsParseabilityService } from '../ats/ats-parseability.service';
import { AtsSeverity } from '../ats/ats.types';
import {
  AI_CONTENT_HEURISTIC_CONFIG,
  ResumeAiContentHeuristicService,
} from '../employer-pipeline/resume-ai-content-heuristic.service';
import { Resume, ResumeDocument } from '../schemas/resume.schema';

export type ResumeComparisonAnnotation = {
  id: string;
  section: 'personal' | 'summary' | 'experience' | 'skills' | 'achievements' | 'certifications';
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
    private readonly atsParseability: AtsParseabilityService,
    private readonly atsMatch: AtsMatchService,
    private readonly aiContent: ResumeAiContentHeuristicService,
  ) {}

  async compare(
    resumeId: string,
    userId: string,
    input: { jobDescription?: string },
  ) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId: new Types.ObjectId(userId) })
      .exec();
    if (!resume) throw new NotFoundException('Resume not found');
    if (!['imported', 'ai_rewrite'].includes(resume.creationMethod || '')) {
      throw new BadRequestException('Compare Resume is available for imported resumes.');
    }

    const structured = resume.toObject ? resume.toObject() : resume;
    const text = this.resumeText(structured as Resume);
    const ats = this.atsParseability.check({ structured: structured as any });
    const match = input.jobDescription?.trim()
      ? this.atsMatch.match(structured as any, input.jobDescription)
      : null;
    const aiContent = this.aiContent.analyze(text);

    return {
      resumeId,
      ats,
      match,
      aiContent,
      annotations: this.annotations(structured as Resume, ats.findings, match, aiContent),
    };
  }

  private annotations(resume: Resume, findings: any[], match: any, aiContent: any) {
    const annotations: ResumeComparisonAnnotation[] = findings.map((finding, index) => ({
      id: `ats-${finding.code || index}`,
      section: this.sectionForFinding(finding.code),
      severity: finding.severity,
      color: this.colorFor(finding.severity),
      message: finding.message,
      fix: finding.fix,
    }));

    for (const skill of match?.missing || []) {
      annotations.push({
        id: `missing-${skill}`,
        section: 'skills',
        severity: 'warning',
        color: 'amber',
        message: `${this.title(skill)} is requested by the job but not evidenced in this resume.`,
        fix: `Add ${this.title(skill)} only if it is accurate, and support it with a concrete example.`,
      });
    }

    const stockPhrase = AI_CONTENT_HEURISTIC_CONFIG.stockPhrases.find((phrase) =>
      this.resumeText(resume).toLowerCase().includes(phrase),
    );
    if (aiContent.signals?.stockPhrases?.likelihood >= 65 && stockPhrase) {
      const stockPhraseSection = String(resume.summary || '').toLowerCase().includes(stockPhrase)
        ? 'summary'
        : 'experience';
      annotations.push({
        id: 'ai-stock-phrases',
        section: stockPhraseSection,
        severity: 'critical',
        color: 'red',
        message: aiContent.signals.stockPhrases.explanation,
        fix: 'Replace the stock phrase with a specific outcome, scope, or example from your work.',
        quote: this.title(stockPhrase),
      });
    }

    const experienceSignals = [
      ['repetitiveSentenceOpeners', 'Vary repeated sentence openings so each achievement reads distinctly.'],
      ['punctuationBulletSectionRegularity', 'Vary bullet length and structure while keeping the style consistent.'],
      ['sentenceLengthVariance', 'Mix concise impact statements with enough context to explain the result.'],
    ] as const;
    for (const [key, fix] of experienceSignals) {
      const signal = aiContent.signals?.[key];
      if (signal?.likelihood < 65) continue;
      annotations.push({
        id: `ai-${key}`,
        section: 'experience',
        severity: signal.likelihood >= 80 ? 'critical' : 'warning',
        color: signal.likelihood >= 80 ? 'red' : 'amber',
        message: signal.explanation,
        fix,
      });
    }

    return annotations;
  }

  private sectionForFinding(code = ''): ResumeComparisonAnnotation['section'] {
    if (/CONTACT|EMAIL|PHONE|LINKEDIN|NAME/.test(code)) return 'personal';
    if (/SKILL/.test(code)) return 'skills';
    if (/EXPERIENCE|DATE|BULLET/.test(code)) return 'experience';
    if (/CERT/.test(code)) return 'certifications';
    return 'summary';
  }

  private colorFor(severity: AtsSeverity): ResumeComparisonAnnotation['color'] {
    return severity === 'critical' ? 'red' : severity === 'warning' ? 'amber' : 'blue';
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
      summary: resume.summary,
      skills: resume.skills,
      experience: resume.experience,
      achievements: (resume as any).achievements,
      certifications: resume.certifications,
    });
    return parts.join('\n');
  }

  private title(value: string): string {
    if (/^[a-z0-9+#.]{1,4}$/i.test(value)) return value.toUpperCase();
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
