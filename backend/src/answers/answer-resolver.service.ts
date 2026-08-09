import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  QuestionCatalog,
  QuestionCatalogDocument,
  QuestionClass,
} from '../schemas/question-catalog.schema';
import { AnswerType } from '../schemas/answer-bank.schema';
import { AnswerSource } from '../schemas/answer-profile.schema';
import { LLMRoutingService, LLMFeature } from '../llm/llm-routing.service';
import { AnswerProfileService } from './answer-profile.service';
import { AnswerBankService } from './answer-bank.service';
import { OptionMapperService, floorFor } from './option-mapper.service';
import { normalizeQuestion } from './question-normalizer';
import {
  classifyQuestion,
  requiresCandidateAnswer,
  allowsModelDraft,
} from './question-classifier';

import type { FormField, FormOption } from './form-schema.types';

export type { FormField, FormOption };

export interface ResolvedAnswer {
  fieldName: string;
  questionKey: string;
  questionClass: QuestionClass | null;
  label: string;
  value: any;
  source: 'profile' | 'bank' | 'identity' | 'ai_draft';
  confidence: number;
  via?: string;
}

export interface Blocker {
  fieldName: string;
  questionKey: string;
  label: string;
  questionClass: QuestionClass | null;
  reason: string;
  required: boolean;
  options?: FormOption[];
  answerType: AnswerType;
}

export interface ResolveResult {
  answers: ResolvedAnswer[];
  blockers: Blocker[];
  unknownQuestions: string[];
}

export interface ResolveContext {
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  /** ISO2 the application is FOR — used for country-scoped attestations. */
  targetCountry?: string | null;
  /** Name/email/phone etc. already known from the account. */
  identity?: Record<string, any>;
}

/**
 * Turn an introspected form into resolved answers plus the blockers a human
 * must clear.
 *
 * Resolution order — and the order IS the safety model:
 *   1. AnswerProfile  — candidate-stated facts
 *   2. AnswerBank     — what this candidate answered before
 *   3. QuestionCatalog— global question -> profile-field mapping
 *   4. Model draft    — PROSE ONLY
 *   5. Unknown        — a blocker the candidate answers once, then it is learned
 *
 * An attestation with no stored fact becomes a blocker. It is never sent to a
 * model, not even to "have a reasonable go" — a fabricated legal statement
 * submitted under someone's name is the one failure this feature cannot have.
 */
@Injectable()
export class AnswerResolverService {
  private readonly logger = new Logger(AnswerResolverService.name);

  constructor(
    @InjectModel(QuestionCatalog.name)
    private readonly catalogModel: Model<QuestionCatalogDocument>,
    private readonly profiles: AnswerProfileService,
    private readonly bank: AnswerBankService,
    private readonly mapper: OptionMapperService,
    private readonly llm: LLMRoutingService,
  ) {}

  async resolve(
    userId: string,
    fields: FormField[],
    context: ResolveContext = {},
  ): Promise<ResolveResult> {
    const catalog = await this.catalogModel.find({ active: { $ne: false } }).lean();
    const profile = await this.profiles.getOrCreate(userId);

    // Classify everything up front so the answer bank is one query, not N.
    const classified = (fields || []).map((field) => {
      const question = normalizeQuestion(field.label || field.name, context.companyName);
      return { field, question, classification: classifyQuestion(question, catalog as any) };
    });

    const bankRows = await this.bank.lookupMany(
      userId,
      classified.map((c) => c.classification.questionKey),
    );

    const answers: ResolvedAnswer[] = [];
    const blockers: Blocker[] = [];
    const unknownQuestions: string[] = [];
    const usedKeys: string[] = [];

    for (const { field, question, classification } of classified) {
      const { questionClass, questionKey, profileField, countryScoped } = classification;

      // Files are satisfied by the résumé/cover-letter builders upstream.
      if (questionClass === QuestionClass.FILE || field.type === 'file') {
        continue;
      }

      const answerType = this.answerTypeFor(field);
      const blocker = (reason: string): Blocker => ({
        fieldName: field.name,
        questionKey,
        label: field.label || field.name,
        questionClass,
        reason,
        required: !!field.required,
        options: field.options,
        answerType,
      });

      if (questionClass === null) unknownQuestions.push(field.label || field.name);

      // ---- 1) Stored fact: profile, then bank --------------------------
      const country = countryScoped ? question.country || context.targetCountry || null : null;
      let value = profileField
        ? this.profiles.getFieldValue(profile, profileField, country)
        : undefined;
      let source: ResolvedAnswer['source'] = 'profile';

      if (!this.profiles.isAnswered(value)) {
        const remembered = bankRows.get(questionKey);
        if (remembered && this.profiles.isAnswered(remembered.value)) {
          value = remembered.value;
          source = 'bank';
        }
      }

      // Identity fields fall back to the account record.
      if (!this.profiles.isAnswered(value) && questionClass === QuestionClass.IDENTITY) {
        const fromAccount = (context.identity || {})[profileField || ''];
        if (this.profiles.isAnswered(fromAccount)) {
          value = fromAccount;
          source = 'identity';
        }
      }

      // ---- 2) Nothing stored ------------------------------------------
      if (!this.profiles.isAnswered(value)) {
        // ATTESTATION / DEMOGRAPHIC: stop here. No model, ever.
        if (requiresCandidateAnswer(questionClass)) {
          blockers.push(
            blocker(
              countryScoped && !country
                ? 'We need to know which country this question is about before you answer it.'
                : 'Only you can answer this — we will never guess it.',
            ),
          );
          continue;
        }

        // PROSE: the one class a model may author.
        if (allowsModelDraft(questionClass)) {
          const draft = await this.draftProse(field, context);
          if (draft) {
            answers.push({
              fieldName: field.name,
              questionKey,
              questionClass,
              label: field.label || field.name,
              value: draft,
              source: 'ai_draft',
              confidence: 0.6,
              via: 'model',
            });
            continue;
          }
          blockers.push(blocker('We could not draft this — please write it yourself.'));
          continue;
        }

        // Everything else (preferences, identity, unknown) asks the candidate.
        blockers.push(
          blocker(
            questionClass === null
              ? 'We have not seen this question before. Answer once and we will remember it.'
              : 'Add this to your answer profile and we will reuse it everywhere.',
          ),
        );
        continue;
      }

      // ---- 3) A fact exists. If the form constrains choices, map onto them.
      if (Array.isArray(field.options) && field.options.length) {
        const mapped = this.mapper.mapDeterministic(value, field.options, questionClass);

        if (this.mapper.meetsFloor(mapped, questionClass)) {
          answers.push({
            fieldName: field.name,
            questionKey,
            questionClass,
            label: field.label || field.name,
            value: mapped!.option.value,
            source,
            confidence: mapped!.confidence,
            via: mapped!.via,
          });
          usedKeys.push(questionKey);
          continue;
        }

        // Deterministic mapping failed or scored too low. We know the fact but
        // not which of the employer's options states it — a question for the
        // candidate, not a coin flip.
        blockers.push(
          blocker(
            `We know your answer but not which option matches it (needs ${Math.round(
              floorFor(questionClass) * 100,
            )}% confidence).`,
          ),
        );
        continue;
      }

      // ---- 4) Free-form field with a known value ------------------------
      answers.push({
        fieldName: field.name,
        questionKey,
        questionClass,
        label: field.label || field.name,
        value,
        source,
        confidence: source === 'bank' ? 0.9 : 1,
      });
      usedKeys.push(questionKey);
    }

    await this.bank.markUsed(userId, usedKeys);

    return { answers, blockers, unknownQuestions };
  }

  /**
   * Draft a prose answer. Called ONLY for {@link QuestionClass.PROSE} — the
   * single entry point to a model in this service.
   */
  private async draftProse(field: FormField, context: ResolveContext): Promise<string | null> {
    try {
      const provider = this.llm.getProviderForFeature(LLMFeature.GENERATE_COVER_LETTER);
      const config = this.llm.getFeatureConfig(LLMFeature.GENERATE_COVER_LETTER);

      const limit = field.maxLength && field.maxLength > 0 ? field.maxLength : 900;
      const response = await provider.chat({
        messages: [
          {
            role: 'system',
            content:
              'You draft answers to job application questions in the candidate\'s voice. ' +
              'Use ONLY facts supplied in the prompt. Never invent employment history, ' +
              'qualifications, visa status, or any legal fact. Be specific and concise. ' +
              'Return the answer text alone, with no preamble.',
          },
          {
            role: 'user',
            content: [
              `Question: ${field.label || field.name}`,
              context.jobTitle ? `Role: ${context.jobTitle}` : '',
              context.companyName ? `Company: ${context.companyName}` : '',
              context.jobDescription
                ? `Job description (excerpt): ${String(context.jobDescription).slice(0, 1500)}`
                : '',
              `Keep it under ${limit} characters.`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      });

      const text = String(response?.content || '').trim();
      return text ? text.slice(0, limit) : null;
    } catch (err) {
      this.logger.warn(
        `Prose draft failed for "${field.label || field.name}": ${
          err instanceof Error ? err.message : err
        }`,
      );
      return null;
    }
  }

  /** Map an HTML control type onto the answer-bank's value shape. */
  private answerTypeFor(field: FormField): AnswerType {
    switch (String(field.type || '').toLowerCase()) {
      case 'textarea':
        return AnswerType.TEXTAREA;
      case 'select':
      case 'radio':
        return AnswerType.SELECT;
      case 'checkbox':
        return field.options && field.options.length > 1
          ? AnswerType.MULTISELECT
          : AnswerType.BOOLEAN;
      case 'number':
        return AnswerType.NUMBER;
      case 'date':
        return AnswerType.DATE;
      case 'file':
        return AnswerType.FILE;
      default:
        return AnswerType.TEXT;
    }
  }

  /**
   * Persist a candidate's answer to a blocker so the next form resolves it
   * automatically. Attestations additionally write through to the profile,
   * which is the only place they are allowed to originate.
   */
  async learnFromCandidate(params: {
    userId: string;
    questionKey: string;
    value: any;
    answerType?: AnswerType;
    rawSample?: string;
    profileField?: string;
    country?: string | null;
  }): Promise<void> {
    await this.bank.remember({
      userId: params.userId,
      questionKey: params.questionKey,
      value: params.value,
      answerType: params.answerType,
      source: AnswerSource.CANDIDATE,
      confidence: 1,
      rawSample: params.rawSample,
    });
  }
}
