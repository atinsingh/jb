import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerDistributionChannel,
  EmployerDistributionChannelDocument,
} from './schemas/employer-distribution-channel.schema';
import { UpdateChannelDto } from './dto/update-channel.dto';

// The set of distribution channels the product offers. This is a definitional
// catalog (what an employer *can* enable), not per-owner data. Every owner
// starts with all channels disabled and zero spend until they act.
const CHANNEL_CATALOG = [
  {
    key: 'careers',
    name: 'Careers page',
    tagline: 'Your branded careers site',
    sponsorable: false,
  },
  {
    key: 'linkedin',
    name: 'LinkedIn Jobs',
    tagline: 'Reach 900M professionals',
    sponsorable: true,
  },
  {
    key: 'indeed',
    name: 'Indeed',
    tagline: 'World’s #1 job site',
    sponsorable: true,
  },
  {
    key: 'ziprecruiter',
    name: 'ZipRecruiter',
    tagline: 'AI matching to candidates',
    sponsorable: true,
  },
  {
    key: 'designernews',
    name: 'Designer News',
    tagline: 'Niche design community',
    sponsorable: false,
  },
];

@Injectable()
export class EmployerDistributionService {
  constructor(
    @InjectModel(EmployerDistributionChannel.name)
    private channelModel: Model<EmployerDistributionChannelDocument>,
  ) {}

  async getDistribution(ownerId: string): Promise<{
    channels: Array<Record<string, unknown>>;
    performance: Array<Record<string, unknown>>;
  }> {
    const stored = await this.channelModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .exec();
    const byKey = new Map(stored.map((c) => [c.key, c]));

    // Merge the catalog with the owner's real, persisted state. Channels the
    // owner has never touched default to off / zero spend.
    const channels = CHANNEL_CATALOG.map((cat) => {
      const doc = byKey.get(cat.key);
      return {
        key: cat.key,
        name: cat.name,
        tagline: cat.tagline,
        sponsorable: cat.sponsorable,
        enabled: doc?.enabled ?? false,
        spend: doc?.spend ?? 0,
        status: doc?.status ?? 'off',
      };
    });

    // Per-channel performance requires real impression/apply tracking, which is
    // not wired yet — return nothing rather than fabricated metrics.
    return { channels, performance: [] };
  }

  async updateChannel(
    ownerId: string,
    key: string,
    dto: UpdateChannelDto,
  ): Promise<EmployerDistributionChannelDocument> {
    const catalogEntry = CHANNEL_CATALOG.find((c) => c.key === key);
    if (!catalogEntry) {
      throw new NotFoundException('Channel not found');
    }

    const ownerObjectId = new Types.ObjectId(ownerId);
    const channel =
      (await this.channelModel.findOne({ ownerId: ownerObjectId, key }).exec()) ??
      new this.channelModel({
        ownerId: ownerObjectId,
        key,
        name: catalogEntry.name,
        tagline: catalogEntry.tagline,
        sponsorable: catalogEntry.sponsorable,
        enabled: false,
        spend: 0,
        status: 'off',
      });

    if (dto.enabled !== undefined) {
      channel.enabled = dto.enabled;
    }
    if (dto.spend !== undefined) {
      channel.spend = dto.spend;
    }
    if (dto.status !== undefined) {
      channel.status = dto.status;
    } else if (dto.enabled !== undefined) {
      channel.status = dto.enabled ? 'live' : 'paused';
    }

    return channel.save();
  }
}
