import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerSecuritySettings,
  EmployerSecuritySettingsDocument,
} from './schemas/employer-security-settings.schema';
import { UpdateSecurityDto } from './dto/update-security.dto';

@Injectable()
export class EmployerSecurityService {
  constructor(
    @InjectModel(EmployerSecuritySettings.name)
    private securityModel: Model<EmployerSecuritySettingsDocument>,
  ) {}

  async getOrCreateSecurity(
    ownerId: string,
  ): Promise<EmployerSecuritySettingsDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);

    return this.securityModel
      .findOneAndUpdate(
        { ownerId: ownerObjectId },
        { $setOnInsert: { ownerId: ownerObjectId } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async update(
    ownerId: string,
    dto: UpdateSecurityDto,
  ): Promise<EmployerSecuritySettingsDocument> {
    const settings = await this.getOrCreateSecurity(ownerId);

    if (dto.idp !== undefined) settings.idp = dto.idp;
    if (dto.ssoMetadataUrl !== undefined) settings.ssoMetadataUrl = dto.ssoMetadataUrl;
    if (dto.enforceSso !== undefined) settings.enforceSso = dto.enforceSso;
    if (dto.scimEnabled !== undefined) settings.scimEnabled = dto.scimEnabled;
    if (dto.scimToken !== undefined) settings.scimToken = dto.scimToken;
    if (dto.idleTimeout !== undefined) settings.idleTimeout = dto.idleTimeout;
    if (dto.twoFactorRequired !== undefined)
      settings.twoFactorRequired = dto.twoFactorRequired;
    if (dto.autoDeleteEnabled !== undefined)
      settings.autoDeleteEnabled = dto.autoDeleteEnabled;
    if (dto.ipAllowlist !== undefined) settings.ipAllowlist = dto.ipAllowlist;

    return settings.save();
  }
}
