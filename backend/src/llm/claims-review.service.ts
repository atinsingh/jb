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
    // Patterns that indicate unverifiable claims.
    //
    // These run over MODEL-GENERATED text to decide what a human should confirm
    // before it lands on their résumé, so recall matters more than precision: a
    // needless review prompt is cheap, an invented statistic on someone's résumé
    // is not. The patterns are correspondingly generous.
    //
    // The improvement pattern in particular used to require the verb to be
    // immediately followed by "by"/"to" (`reduced by 40%`). Real résumé bullets
    // name the metric in between — "Reduced payment processing latency by 40%" —
    // so the guardrail matched almost nothing it existed to catch. `METRIC`
    // below allows that intervening phrase, bounded so it cannot run across a
    // whole sentence and match an unrelated number.
    const VERB =
      '(?:increas|improv|boost|enhanc|optimiz|reduc|decreas|accelerat|grew|grow|cut|lower|rais|scal|drov|driv)(?:ed|es|ing|e)?';
    const METRIC = '(?:\\s+[\\w-]+){0,6}?';
    const AMOUNT = '(?:\\d[\\d,.]*\\s*(?:%|x|k|m|bn?|billion|million|thousand)?)';

    const patterns = [
      {
        regex: new RegExp(`\\b${VERB}${METRIC}\\s+(?:by|to|from)\\s+${AMOUNT}`, 'gi'),
        reason: 'Quantifiable improvement claim without verification',
      },
      {
        // The same claim stated as a noun phrase rather than a verb: "a 25%
        // reduction in latency", "a 15% decrease in error rates". Models reach
        // for this form constantly, and it shares no structure with the verb
        // pattern above.
        regex:
          /\b\d[\d,.]*\s*(?:%|x)?\s*(?:reduction|increase|decrease|improvement|growth|gain|drop|boost|uplift|savings?)\b/gi,
        reason: 'Quantifiable improvement claim without verification',
      },
      {
        // Bare scale claims carry no verb at all: "99.99% uptime",
        // "100,000+ transactions per minute", "40% faster".
        regex:
          /\b\d[\d,.]*\+?\s*(?:%|x)?\s*(?:uptime|availability|faster|slower|requests?|transactions?|queries|users?|customers?|records?|events?|rps|qps)\b/gi,
        reason: 'Scale or performance claim without verification',
      },
      {
        regex: /\b(?:saved|generated|earned|produced|cut costs?)\s+(?:by\s+)?\$?[\d,]+/gi,
        reason: 'Financial impact claim without verification',
      },
      {
        regex:
          /\b(?:led|managed|directed|oversaw|mentored|coordinated)\s+(?:a\s+)?(?:cross[- ]functional\s+)?(?:team|group|department|org(?:anization)?)\s+of\s+\d+/gi,
        reason: 'Leadership claim without verification',
      },
      {
        regex: /\b(?:awarded|recognized|honored|selected|promoted)\s+(?:as|for|to)/gi,
        reason: 'Award/recognition claim without verification',
      },
    ];

    const claims: UnverifiableClaim[] = [];
    // Split on sentence terminators only. A period is a terminator only when
    // whitespace or end-of-input follows it: splitting on every '.' tore
    // "99.99% uptime" into "99" and "99% uptime", so the claim shown to the user
    // for confirmation stated a different number than the model actually wrote
    // (and it would do the same to "Node.js").
    const sentences = (content || '')
      .split(/[!?\n]+|\.(?=\s|$)/)
      .filter((s) => s && s.trim().length > 0);

    // Broader patterns overlap, so the same span can match more than one. Key on
    // sentence + matched text so a bullet is not surfaced to the user twice for
    // what is, to them, a single claim to confirm.
    const seen = new Set<string>();

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      for (const pattern of patterns) {
        const matches = trimmed.match(pattern.regex);
        if (!matches) continue;

        for (const match of matches) {
          const key = `${trimmed}::${match.toLowerCase().trim()}`;
          if (seen.has(key)) continue;
          seen.add(key);

          claims.push({
            claim: match.trim(),
            originalText: trimmed,
            suggestedText: trimmed, // Will be replaced by AI suggestion
            confidence: 0.7,
            reason: pattern.reason,
          });
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

