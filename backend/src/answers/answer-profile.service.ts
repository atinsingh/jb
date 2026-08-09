import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AnswerProfile,
  AnswerProfileDocument,
  AnswerSource,
  ATTESTATION_FIELDS,
  DECLINE,
  WorkAuthStatus,
  isAttestationField,
} from '../schemas/answer-profile.schema';

/**
 * The candidate's own declared facts.
 *
 * The single rule this service exists to enforce: an attestation field can only
 * ever be written with `AnswerSource.CANDIDATE`. Immigration status, age,
 * criminal history, clearance and protected characteristics are statements made
 * in the candidate's name on a real job application — a model may never author
 * one, and this is where that becomes an architectural guarantee rather than a
 * prompt instruction.
 */
@Injectable()
export class AnswerProfileService {
  private readonly logger = new Logger(AnswerProfileService.name);

  constructor(
    @InjectModel(AnswerProfile.name)
    private readonly profileModel: Model<AnswerProfileDocument>,
  ) {}

  /** Fetch (creating an empty profile on first access). */
  async getOrCreate(userId: string): Promise<AnswerProfileDocument> {
    const uid = new Types.ObjectId(userId);
    const existing = await this.profileModel.findOne({ userId: uid }).exec();
    if (existing) return existing;

    return this.profileModel.create({ userId: uid });
  }

  /**
   * Apply a patch.
   *
   * @throws ForbiddenException when a non-candidate source touches an
   *         attestation field. This is a hard failure, never a silent drop —
   *         a caller trying to machine-write an attestation is a bug that must
   *         surface loudly.
   */
  async update(
    userId: string,
    patch: Partial<AnswerProfile>,
    source: AnswerSource,
  ): Promise<AnswerProfileDocument> {
    const touched = Object.keys(patch || {});
    if (!touched.length) return this.getOrCreate(userId);

    if (source !== AnswerSource.CANDIDATE) {
      const forbidden = touched.filter(isAttestationField);
      if (forbidden.length) {
        this.logger.error(
          `Refused ${source} write to attestation field(s): ${forbidden.join(', ')}`,
        );
        throw new ForbiddenException(
          `Attestation fields may only be set by the candidate: ${forbidden.join(', ')}`,
        );
      }
    }

    const now = new Date();
    const set: Record<string, any> = {};
    for (const [field, value] of Object.entries(patch)) {
      set[field] = value;
      set[`fieldSources.${field}`] = { source, updatedAt: now };
    }

    const uid = new Types.ObjectId(userId);
    return this.profileModel
      .findOneAndUpdate({ userId: uid }, { $set: set }, { new: true, upsert: true })
      .exec();
  }

  /**
   * Record the candidate's work-authorization status for one country.
   * Always a candidate-sourced write by construction.
   */
  async setWorkAuthorization(
    userId: string,
    country: string,
    status: WorkAuthStatus,
  ): Promise<AnswerProfileDocument> {
    const iso = String(country || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) {
      throw new BadRequestException(`Expected an ISO2 country code, got "${country}"`);
    }
    if (!Object.values(WorkAuthStatus).includes(status)) {
      throw new BadRequestException(`Unknown work authorization status "${status}"`);
    }

    const now = new Date();
    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            [`workAuthorization.${iso}`]: status,
            [`fieldSources.workAuthorization.${iso}`]: {
              source: AnswerSource.CANDIDATE,
              updatedAt: now,
            },
          },
        },
        { new: true, upsert: true },
      )
      .exec();
  }

  /**
   * Read one value out of a profile by the catalog's `profileField`.
   *
   * @param country ISO2, required for country-scoped fields like work
   *                authorization; without it the answer is genuinely unknown
   *                rather than a guess at the candidate's home country.
   * @returns the value, or `undefined` when unanswered
   */
  getFieldValue(
    profile: AnswerProfile | null | undefined,
    field: string,
    country?: string | null,
  ): any {
    if (!profile || !field) return undefined;

    if (field === 'workAuthorization') {
      const iso = String(country || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(iso)) return undefined;
      return (profile.workAuthorization || {})[iso];
    }

    return (profile as any)[field];
  }

  /**
   * True when a value counts as answered. `decline_to_answer` IS an answer —
   * the candidate chose it — whereas undefined/empty is not.
   */
  isAnswered(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  /** Attestation fields with no value yet — the ones that will block a prepare. */
  unansweredAttestations(profile: AnswerProfile | null | undefined): string[] {
    return ATTESTATION_FIELDS.filter((f) => {
      // Work authorization is per-country; emptiness is judged at question time.
      if (f === 'workAuthorization') {
        return !Object.keys((profile?.workAuthorization as any) || {}).length;
      }
      return !this.isAnswered((profile as any)?.[f]);
    });
  }

  /** The EEO defaults every new profile starts from. */
  static eeoDefaults() {
    return {
      eeoGender: DECLINE,
      eeoEthnicity: DECLINE,
      eeoVeteranStatus: DECLINE,
      eeoDisabilityStatus: DECLINE,
    };
  }
}
