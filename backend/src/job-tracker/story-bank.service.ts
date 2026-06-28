import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StoryBank, StoryBankDocument, STAREntry } from '../schemas/story-bank.schema';

@Injectable()
export class StoryBankService {
  private readonly logger = new Logger(StoryBankService.name);

  constructor(
    @InjectModel(StoryBank.name)
    private storyBankModel: Model<StoryBankDocument>,
  ) {}

  /**
   * Create a new story entry
   */
  async createStory(
    userId: string,
    data: {
      title: string;
      description?: string;
      star: STAREntry;
      competencies: string[];
      skills: string[];
      tags?: string[];
    },
  ): Promise<StoryBankDocument> {
    const story = new this.storyBankModel({
      userId,
      ...data,
      tags: data.tags || [],
    });

    return story.save();
  }

  /**
   * Get all stories for a user
   */
  async getStories(
    userId: string,
    filters?: {
      competencies?: string[];
      skills?: string[];
      isFavorite?: boolean;
      search?: string;
    },
  ): Promise<StoryBankDocument[]> {
    const query: any = { userId };

    if (filters?.competencies && filters.competencies.length > 0) {
      query.competencies = { $in: filters.competencies };
    }

    if (filters?.skills && filters.skills.length > 0) {
      query.skills = { $in: filters.skills };
    }

    if (filters?.isFavorite !== undefined) {
      query.isFavorite = filters.isFavorite;
    }

    let stories = await this.storyBankModel.find(query).sort({ createdAt: -1 }).exec();

    // Apply search filter if provided
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      stories = stories.filter(
        (story) =>
          story.title.toLowerCase().includes(searchLower) ||
          story.description?.toLowerCase().includes(searchLower) ||
          story.star.situation.toLowerCase().includes(searchLower) ||
          story.star.task.toLowerCase().includes(searchLower) ||
          story.star.action.toLowerCase().includes(searchLower) ||
          story.star.result.toLowerCase().includes(searchLower),
      );
    }

    return stories;
  }

  /**
   * Get story by ID
   */
  async getStory(storyId: string, userId: string): Promise<StoryBankDocument | null> {
    return this.storyBankModel.findOne({ _id: storyId, userId }).exec();
  }

  /**
   * Update story
   */
  async updateStory(
    storyId: string,
    userId: string,
    updates: Partial<{
      title: string;
      description: string;
      star: STAREntry;
      competencies: string[];
      skills: string[];
      tags: string[];
      isFavorite: boolean;
    }>,
  ): Promise<StoryBankDocument | null> {
    return this.storyBankModel
      .findOneAndUpdate({ _id: storyId, userId }, updates, { new: true })
      .exec();
  }

  /**
   * Delete story
   */
  async deleteStory(storyId: string, userId: string): Promise<boolean> {
    const result = await this.storyBankModel
      .deleteOne({ _id: storyId, userId })
      .exec();
    return result.deletedCount > 0;
  }

  /**
   * Get stories by competencies (for interview prep)
   */
  async getStoriesByCompetencies(
    userId: string,
    competencies: string[],
  ): Promise<StoryBankDocument[]> {
    return this.storyBankModel
      .find({
        userId,
        competencies: { $in: competencies },
      })
      .sort({ isFavorite: -1, createdAt: -1 })
      .exec();
  }

  /**
   * Get all unique competencies for a user
   */
  async getUserCompetencies(userId: string): Promise<string[]> {
    const stories = await this.storyBankModel.find({ userId }).exec();
    const competenciesSet = new Set<string>();

    for (const story of stories) {
      for (const competency of story.competencies) {
        competenciesSet.add(competency);
      }
    }

    return Array.from(competenciesSet).sort();
  }

  /**
   * Get all unique skills for a user
   */
  async getUserSkills(userId: string): Promise<string[]> {
    const stories = await this.storyBankModel.find({ userId }).exec();
    const skillsSet = new Set<string>();

    for (const story of stories) {
      for (const skill of story.skills) {
        skillsSet.add(skill);
      }
    }

    return Array.from(skillsSet).sort();
  }
}

