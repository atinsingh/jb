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
    // Atomic upsert avoids the check-then-insert race that triggered
    // E11000 duplicate-key errors on the unique userId index under
    // concurrent requests (e.g. dashboard firing parallel loads).
    const _id = new Types.ObjectId(userId);
    return this.prefsModel.findOneAndUpdate(
      { userId: _id },
      { $setOnInsert: { userId: _id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
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
