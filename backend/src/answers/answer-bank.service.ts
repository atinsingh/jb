import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnswerBank, AnswerBankDocument, AnswerType } from '../schemas/answer-bank.schema';
import { AnswerSource } from '../schemas/answer-profile.schema';

/** How many verbatim phrasings to retain per question, for debugging. */
const MAX_RAW_SAMPLES = 5;

/**
 * Remembered answers, per candidate, per normalized question.
 *
 * This is the compounding part of the system: the first application asks the
 * candidate a handful of questions the profile cannot answer; every later
 * application resolves them from here. A candidate who answers ten questions
 * once should approach zero questions by their tenth application.
 */
@Injectable()
export class AnswerBankService {
  private readonly logger = new Logger(AnswerBankService.name);

  constructor(
    @InjectModel(AnswerBank.name)
    private readonly bankModel: Model<AnswerBankDocument>,
  ) {}

  /** Look up one remembered answer. */
  async lookup(userId: string, questionKey: string): Promise<AnswerBankDocument | null> {
    if (!questionKey) return null;
    return this.bankModel
      .findOne({ userId: new Types.ObjectId(userId), questionKey })
      .exec();
  }

  /** Look up many at once — one query per prepare rather than one per field. */
  async lookupMany(
    userId: string,
    questionKeys: string[],
  ): Promise<Map<string, AnswerBankDocument>> {
    const keys = [...new Set((questionKeys || []).filter(Boolean))];
    if (!keys.length) return new Map();

    const rows = await this.bankModel
      .find({ userId: new Types.ObjectId(userId), questionKey: { $in: keys } })
      .exec();

    return new Map(rows.map((r) => [r.questionKey, r]));
  }

  /**
   * Store (or correct) an answer.
   *
   * Called when the candidate answers a blocker in the approval queue, and when
   * they edit an answer at review — which is why a correction made once applies
   * to every future application.
   */
  async remember(params: {
    userId: string;
    questionKey: string;
    value: any;
    answerType?: AnswerType;
    source?: AnswerSource;
    confidence?: number;
    rawSample?: string;
  }): Promise<AnswerBankDocument> {
    const {
      userId,
      questionKey,
      value,
      answerType = AnswerType.TEXT,
      source = AnswerSource.CANDIDATE,
      confidence = source === AnswerSource.CANDIDATE ? 1 : 0.5,
      rawSample,
    } = params;

    const now = new Date();
    const update: Record<string, any> = {
      $set: {
        value,
        answerType,
        source,
        confidence,
        // Only a candidate answer counts as confirmation.
        ...(source === AnswerSource.CANDIDATE ? { lastConfirmedAt: now } : {}),
      },
      $setOnInsert: {
        userId: new Types.ObjectId(userId),
        questionKey,
      },
    };

    if (rawSample) {
      // Bounded so a pathological form cannot grow the doc without limit.
      update.$addToSet = { rawSamples: { $each: [rawSample], $slice: -MAX_RAW_SAMPLES } };
    }

    return this.bankModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), questionKey },
        update,
        { new: true, upsert: true },
      )
      .exec();
  }

  /** Record that a remembered answer was actually used on a form. */
  async markUsed(userId: string, questionKeys: string[]): Promise<void> {
    const keys = [...new Set((questionKeys || []).filter(Boolean))];
    if (!keys.length) return;

    await this.bankModel
      .updateMany(
        { userId: new Types.ObjectId(userId), questionKey: { $in: keys } },
        { $inc: { timesUsed: 1 }, $set: { lastUsedAt: new Date() } },
      )
      .exec();
  }

  /** Everything this candidate has taught the system, newest use first. */
  async listForUser(userId: string): Promise<AnswerBankDocument[]> {
    return this.bankModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ lastUsedAt: -1, updatedAt: -1 })
      .exec();
  }

  /** Forget one answer (candidate-initiated). */
  async forget(userId: string, questionKey: string): Promise<void> {
    await this.bankModel
      .deleteOne({ userId: new Types.ObjectId(userId), questionKey })
      .exec();
  }
}
