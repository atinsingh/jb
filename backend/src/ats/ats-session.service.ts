import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { ResumeHarnessSession, ResumeHarnessSessionDocument } from '../resume-harness/schemas/resume-harness-session.schema';
import { AtsSession, AtsSessionDocument } from './schemas/ats-session.schema';
import { ResumeMatcherAdapter } from './resume-matcher.adapter';

export interface StartAtsSessionInput {
  resumeSessionId: string;
  sourceRevision: number;
  jobDescription: string;
}

@Injectable()
export class AtsSessionService {
  constructor(
    @InjectModel(AtsSession.name) private readonly atsModel: Model<AtsSessionDocument>,
    @InjectModel(ResumeHarnessSession.name) private readonly resumeModel: Model<ResumeHarnessSessionDocument>,
    private readonly adapter: ResumeMatcherAdapter,
  ) {}

  async start(userId: string, input: StartAtsSessionInput) {
    const resume = await this.resume(userId, input.resumeSessionId);
    if (resume.status !== 'active' || !resume.sandboxId) {
      throw new ConflictException('Continue this résumé to start ATS analysis.');
    }
    if (resume.revision !== input.sourceRevision) {
      throw new ConflictException('The selected résumé revision is no longer current.');
    }
    const jobDescription = input.jobDescription.trim();
    if (!jobDescription) throw new BadRequestException('A job description is required');
    const row = await this.atsModel.create({
      userId,
      resumeSessionId: input.resumeSessionId,
      sourceRevision: input.sourceRevision,
      jobDescription,
      jobDescriptionHash: createHash('sha256').update(jobDescription).digest('hex'),
      harness: resume.harness,
      alias: resume.alias,
      status: 'ready',
    });
    return this.view(row, resume.revision);
  }

  async run(userId: string, id: string) {
    const row = await this.mustFind(userId, id);
    const resume = await this.resume(userId, String(row.resumeSessionId));
    if (resume.status !== 'active' || !resume.sandboxId) {
      throw new ConflictException('Continue this résumé to rerun ATS analysis.');
    }
    if (resume.revision !== row.sourceRevision) {
      row.sourceRevision = resume.revision;
    }
    row.status = 'running';
    row.unavailableReason = undefined;
    await row.save();
    try {
      const result = await this.adapter.analyze({
        sandboxId: resume.sandboxId,
        latex: this.latexFor(resume, row.sourceRevision),
        jobDescription: row.jobDescription,
        sourceRevision: row.sourceRevision,
        alias: resume.alias,
      });
      Object.assign(row, result, { status: 'completed', analyzedAt: new Date() });
      await row.save();
      return this.view(row, resume.revision);
    } catch (error: any) {
      row.status = 'failed';
      row.unavailableReason = error?.message || 'ATS analysis is temporarily unavailable.';
      await row.save();
      return this.view(row, resume.revision);
    }
  }

  async get(userId: string, id: string) {
    const row = await this.mustFind(userId, id);
    const resume = await this.resume(userId, String(row.resumeSessionId));
    return this.view(row, resume.revision);
  }

  async latestForResume(userId: string, resumeSessionId: string) {
    await this.resume(userId, resumeSessionId);
    const row = await this.atsModel.findOne({ userId, resumeSessionId }).sort({ createdAt: -1 }).exec();
    if (!row) return null;
    const resume = await this.resume(userId, resumeSessionId);
    return this.view(row, resume.revision);
  }

  async end(userId: string, id: string) {
    const row = await this.mustFind(userId, id);
    row.status = 'ended';
    row.endedAt = new Date();
    await row.save();
    const resume = await this.resume(userId, String(row.resumeSessionId));
    return this.view(row, resume.revision);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.mustFind(userId, id);
    await this.atsModel.deleteOne({ _id: id, userId }).exec();
  }

  private async mustFind(userId: string, id: string): Promise<AtsSessionDocument> {
    const row = await this.atsModel.findOne({ _id: id, userId }).exec();
    if (!row) throw new NotFoundException('ATS session not found');
    return row;
  }

  private async resume(userId: string, id: string): Promise<ResumeHarnessSessionDocument> {
    const row = await this.resumeModel.findOne({ _id: id, userId }).exec();
    if (!row) throw new NotFoundException('Résumé session not found');
    return row;
  }

  private latexFor(resume: ResumeHarnessSessionDocument, revision: number): string {
    if (resume.revision === revision) return resume.latex;
    const turn = resume.turns?.find((candidate) => candidate.revision === revision);
    if (!turn?.latex) throw new NotFoundException('Résumé revision not found');
    return turn.latex;
  }

  private view(row: any, currentRevision: number) {
    return {
      id: String(row._id),
      resumeSessionId: String(row.resumeSessionId),
      sourceRevision: row.sourceRevision,
      currentRevision,
      stale: row.status === 'completed' && row.sourceRevision !== currentRevision,
      status: row.status,
      harness: row.harness,
      alias: row.alias,
      semanticMatch: row.semanticMatch,
      subScores: row.subScores,
      keywordGaps: row.keywordGaps || [],
      injectableKeywords: row.injectableKeywords || [],
      suggestions: row.suggestions || [],
      unavailableReason: row.unavailableReason,
      analyzedAt: row.analyzedAt,
    };
  }
}
