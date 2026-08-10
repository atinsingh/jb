import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EmployerTalentCandidate,
  EmployerTalentCandidateDocument,
} from './schemas/employer-talent-candidate.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';

const SEGMENTS = ['saved', 'silver', 'future'];

function computeInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('');
}

@Injectable()
export class EmployerTalentService {
  constructor(
    @InjectModel(EmployerTalentCandidate.name)
    private candidateModel: Model<EmployerTalentCandidateDocument>,
  ) {}

  async list(
    ownerId: string,
    segment?: string,
    search?: string,
  ): Promise<{
    candidates: EmployerTalentCandidateDocument[];
    counts: { all: number; saved: number; silver: number; future: number };
  }> {
    const query: any = { ownerId };
    if (segment && segment !== 'all') {
      query.segment = segment;
    }
    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      query.$or = [{ name: regex }, { headline: regex }, { skills: regex }];
    }

    const candidates = await this.candidateModel
      .find(query)
      .sort({ addedAt: -1 })
      .exec();

    const all = await this.candidateModel.find({ ownerId }).exec();
    const counts = {
      all: all.length,
      saved: 0,
      silver: 0,
      future: 0,
    };
    for (const seg of SEGMENTS) {
      counts[seg] = all.filter((c) => c.segment === seg).length;
    }

    return { candidates, counts };
  }

  async create(
    ownerId: string,
    dto: CreateCandidateDto,
  ): Promise<EmployerTalentCandidateDocument> {
    const segment = dto.segment || 'saved';
    const tagMap: Record<string, string> = {
      saved: 'Saved',
      silver: 'Silver medalist',
      future: 'Future pipeline',
    };
    const candidate = new this.candidateModel({
      ownerId,
      name: dto.name,
      headline: dto.headline || '',
      initials: computeInitials(dto.name),
      skills: dto.skills || [],
      segment,
      tag: tagMap[segment] || 'Saved',
      source: dto.source || '',
      addedAt: new Date(),
    });
    return candidate.save();
  }

  async remove(ownerId: string, id: string): Promise<{ deleted: boolean }> {
    const result = await this.candidateModel
      .findOneAndDelete({ _id: id, ownerId })
      .exec();
    if (!result) {
      throw new NotFoundException('Candidate not found');
    }
    return { deleted: true };
  }
}
