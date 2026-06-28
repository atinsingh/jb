import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class ResumeService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<UserDocument> {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: updates }, { new: true })
      .select('-password');
  }

  async getUserResumeData(userId: string): Promise<UserDocument> {
    return this.userModel.findById(userId).select('-password');
  }
}

