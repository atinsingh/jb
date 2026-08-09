import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from '../../schemas/resume.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { StorageService } from '../../storage/storage.service';
import { UsersService } from '../../users/users.service';
import { SubmissionMaterials } from './submission-materials.type';

/**
 * Assembles the concrete materials (identity fields, résumé bytes, cover
 * letter) a headless ATS adapter submits for a candidate.
 *
 * Hard rule: this service is fully defensive. Any missing/unresolvable piece
 * leaves that field `undefined` — it must NEVER throw, so the runner can always
 * proceed and let the adapter decide what a missing field means.
 */
@Injectable()
export class CandidateMaterialsService {
  private readonly logger = new Logger(CandidateMaterialsService.name);

  constructor(
    @InjectModel(Resume.name) private readonly resumeModel: Model<ResumeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Build the {@link SubmissionMaterials} for a candidate + application.
   *
   * @param userId       the candidate's User id
   * @param application  the Application being submitted (source of the cover letter)
   */
  async assembleMaterials(
    userId: string,
    application: { coverLetter?: string } | null | undefined,
  ): Promise<SubmissionMaterials> {
    const materials: SubmissionMaterials = {};

    // --- Basic identity fields (reuse the autofill payload) ------------------
    try {
      const payload = await this.usersService.getAutofillPayload(userId);
      if (payload) {
        materials.fullName = payload.fullName;
        materials.firstName = payload.firstName;
        materials.lastName = payload.lastName;
        materials.email = payload.email;
        materials.phone = payload.phone;
        materials.location = payload.location;
        materials.linkedin = (payload as any).linkedin;
        materials.github = (payload as any).github;
      }
    } catch (err) {
      this.logger.warn(
        `assembleMaterials: identity fields unresolved for user ${userId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    // --- Cover letter (already text on the Application) ----------------------
    if (application?.coverLetter) {
      materials.coverLetter = application.coverLetter;
    }

    // --- Résumé bytes -------------------------------------------------------
    try {
      const resume = await this.resolvePrimaryResume(userId);
      // pdfPath is the storage key; pdfUrl may be a public URL fallback.
      const key = resume?.pdfPath || resume?.pdfUrl;
      if (key) {
        const buffer = await this.storageService.getBuffer(key);
        if (buffer && buffer.length) {
          materials.resumeBuffer = buffer;
          materials.resumeFilename = this.buildResumeFilename(resume, materials.fullName);
        }
      }
    } catch (err) {
      // Missing / unreadable résumé is non-fatal: leave resumeBuffer undefined.
      this.logger.warn(
        `assembleMaterials: résumé bytes unresolved for user ${userId}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    return materials;
  }

  /**
   * The candidate's primary résumé: isPrimary desc, then most-recently updated.
   * Mirrors the ordering used elsewhere (ApplicationsService.resolveCandidateFields).
   */
  private async resolvePrimaryResume(userId: string): Promise<ResumeDocument | null> {
    let objectId: Types.ObjectId | string = userId;
    try {
      objectId = new Types.ObjectId(userId);
    } catch {
      /* keep the raw string if it isn't a valid ObjectId */
    }
    return this.resumeModel
      .findOne({ userId: objectId })
      .sort({ isPrimary: -1, updatedAt: -1 })
      .exec();
  }

  /** A sensible upload filename, preferring the candidate's name. */
  private buildResumeFilename(resume: ResumeDocument | null, fullName?: string): string {
    const original = (resume as any)?.source?.originalFilename;
    if (original && /\.pdf$/i.test(original)) return original;
    const base = (fullName || (resume as any)?.name || 'resume')
      .toString()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '');
    return `${base || 'resume'}_Resume.pdf`;
  }
}
