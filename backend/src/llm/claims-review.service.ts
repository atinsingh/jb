import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ClaimsReview,
  ClaimsReviewDocument,
  ClaimsReviewStatus,
} from './schemas/claims-review.schema';
import { LLMFeature } from './llm-routing.service';

export interface UnverifiableClaim {
  claim: string;
  originalText: string;
  suggestedText: string;
  confidence: number;
  reason: string;
}

@Injectable()
export class ClaimsReviewService {
  private readonly logger = new Logger(ClaimsReviewService.name);

  constructor(
    @InjectModel(ClaimsReview.name)
    private claimsReviewModel: Model<ClaimsReviewDocument>,
  ) {}

  /**
   * Detect unverifiable claims in content
   * Returns claims that need user review
   */
  async detectUnverifiableClaims(
    content: string,
    feature: LLMFeature,
  ): Promise<UnverifiableClaim[]> {
    // Patterns that indicate unverifiable claims
    const patterns = [
      {
        regex: /\b(increased|improved|boosted|enhanced|optimized|reduced|decreased)\s+(by|to)\s+(\d+%?|\d+x)/gi,
        reason: 'Quantifiable improvement claim without verification',
      },
      {
        regex: /\b(saved|generated|earned|produced)\s+\$?[\d,]+/gi,
        reason: 'Financial impact claim without verification',
      },
      {
        regex: /\b(led|managed|directed|oversaw)\s+(a\s+)?(team|group|department)\s+of\s+\d+/gi,
        reason: 'Leadership claim without verification',
      },
      {
        regex: /\b(awarded|recognized|honored|selected)\s+(as|for)/gi,
        reason: 'Award/recognition claim without verification',
      },
    ];

    const claims: UnverifiableClaim[] = [];
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    for (const sentence of sentences) {
      for (const pattern of patterns) {
        const matches = sentence.match(pattern.regex);
        if (matches) {
          for (const match of matches) {
            claims.push({
              claim: match,
              originalText: sentence.trim(),
              suggestedText: sentence.trim(), // Will be replaced by AI suggestion
              confidence: 0.7,
              reason: pattern.reason,
            });
          }
        }
      }
    }

    return claims;
  }

  /**
   * Create a claims review request
   */
  async createReviewRequest(
    userId: string,
    feature: LLMFeature,
    originalContent: string,
    suggestedContent: string,
    claim: string,
    metadata?: Record<string, any>,
  ): Promise<ClaimsReviewDocument> {
    const review = new this.claimsReviewModel({
      userId,
      feature,
      originalContent,
      suggestedContent,
      claim,
      status: ClaimsReviewStatus.PENDING,
      metadata,
    });

    return review.save();
  }

  /**
   * Get pending reviews for a user
   */
  async getPendingReviews(userId: string): Promise<ClaimsReviewDocument[]> {
    return this.claimsReviewModel
      .find({
        userId,
        status: ClaimsReviewStatus.PENDING,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Approve a claim
   */
  async approveClaim(
    reviewId: string,
    userId: string,
  ): Promise<ClaimsReviewDocument> {
    return this.claimsReviewModel.findOneAndUpdate(
      { _id: reviewId, userId },
      {
        status: ClaimsReviewStatus.APPROVED,
        userDecision: 'approve',
        reviewedAt: new Date(),
      },
      { new: true },
    );
  }

  /**
   * Reject a claim
   */
  async rejectClaim(
    reviewId: string,
    userId: string,
  ): Promise<ClaimsReviewDocument> {
    return this.claimsReviewModel.findOneAndUpdate(
      { _id: reviewId, userId },
      {
        status: ClaimsReviewStatus.REJECTED,
        userDecision: 'reject',
        reviewedAt: new Date(),
      },
      { new: true },
    );
  }

  /**
   * Modify a claim with user-provided content
   */
  async modifyClaim(
    reviewId: string,
    userId: string,
    modifiedContent: string,
  ): Promise<ClaimsReviewDocument> {
    return this.claimsReviewModel.findOneAndUpdate(
      { _id: reviewId, userId },
      {
        status: ClaimsReviewStatus.MODIFIED,
        userDecision: 'modify',
        modifiedContent,
        reviewedAt: new Date(),
      },
      { new: true },
    );
  }
}

