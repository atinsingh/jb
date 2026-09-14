import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  ApplicationArtifact,
  ApplicationArtifactDocument,
  ArtifactType,
} from '../../schemas/application-artifact.schema';
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
    @InjectModel(ApplicationArtifact.name)
    private readonly applicationArtifactModel: Model<ApplicationArtifactDocument>,
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
    application:
      | {
          _id?: string | Types.ObjectId;
          coverLetter?: string;
          artifacts?: { resumeVersionId?: string | Types.ObjectId };
        }
      | null
      | undefined,
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
      const artifact = await this.resolveSubmittedResumeArtifact(userId, application);
      const key = artifact?.fileUrl;
      if (key) {
        const buffer = await this.storageService.getBuffer(key);
        if (buffer && buffer.length) {
          materials.resumeBuffer = buffer;
          materials.resumeFilename =
            artifact?.fileName || `resume-v${artifact?.version || 1}.pdf`;
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

  private async resolveSubmittedResumeArtifact(
    userId: string,
    application:
      | {
          _id?: string | Types.ObjectId;
          artifacts?: { resumeVersionId?: string | Types.ObjectId };
        }
      | null
      | undefined,
  ): Promise<ApplicationArtifactDocument | null> {
    if (!application?._id || !application.artifacts?.resumeVersionId) return null;
    return this.applicationArtifactModel
      .findOne({
        _id: this.asObjectId(application.artifacts.resumeVersionId),
        applicationId: this.asObjectId(application._id),
        userId: this.asObjectId(userId),
        type: ArtifactType.RESUME_VERSION,
      })
      .exec();
  }

  private asObjectId(value: string | Types.ObjectId): string | Types.ObjectId {
    try {
      return new Types.ObjectId(String(value));
    } catch {
      return value;
    }
  }
}
