import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPreferences, UserPreferencesDocument } from '../schemas/user-preferences.schema';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectModel(UserPreferences.name)
    private prefsModel: Model<UserPreferencesDocument>,
  ) {}

  async getOrCreate(userId: string) {
    const existing = await this.prefsModel.findOne({ userId });
    if (existing) return existing;
    const created = new this.prefsModel({
      userId: new Types.ObjectId(userId),
    });
    return created.save();
  }

  async update(userId: string, dto: UpdatePreferencesDto) {
    const update: any = { ...dto };
    return this.prefsModel.findOneAndUpdate(
      { userId },
      { $set: update },
      { upsert: true, new: true },
    );
  }
}
