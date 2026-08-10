import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EmployerCompany,
  EmployerCompanyDocument,
} from './schemas/employer-company.schema';
import { UpdateCompanyDto } from './dto/update-company.dto';

const EDITABLE_FIELDS: Array<keyof UpdateCompanyDto> = [
  'name',
  'website',
  'industry',
  'size',
  'hq',
  'tagline',
  'description',
  'founded',
  'logoUrl',
  'coverUrl',
  'linkedin',
  'twitter',
];

@Injectable()
export class EmployerCompanyService {
  constructor(
    @InjectModel(EmployerCompany.name)
    private companyModel: Model<EmployerCompanyDocument>,
  ) {}

  async getOrCreate(ownerId: string): Promise<EmployerCompanyDocument> {
    const ownerObjectId = new Types.ObjectId(ownerId);
    return this.companyModel
      .findOneAndUpdate(
        { ownerId: ownerObjectId },
        { $setOnInsert: { ownerId: ownerObjectId } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async update(
    ownerId: string,
    dto: UpdateCompanyDto,
  ): Promise<EmployerCompanyDocument> {
    const company = await this.getOrCreate(ownerId);
    for (const field of EDITABLE_FIELDS) {
      if (dto[field] !== undefined) {
        (company as any)[field] = dto[field];
      }
    }
    return company.save();
  }
}
