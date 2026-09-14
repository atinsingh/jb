import { Injectable } from '@nestjs/common';

export const AI_CONTENT_HEURISTIC_CONFIG = {
  detectorVersion: 'jobocate-heuristic-v1',
  weightingVersion: 'weights-v1',
  weights: {
    sentenceLengthVariance: 0.22,
    vocabularyDiversity: 0.18,
    repetitiveSentenceOpeners: 0.16,
    stockPhrases: 0.18,
    punctuationBulletSectionRegularity: 0.14,
    readability: 0.12,
  },
  normalization: {
    sentenceVarianceCeiling: 20,
    vocabularyDiversityHumanFloor: 0.75,
    vocabularyDiversityAiCeiling: 0.3,
    readabilityCenter: 60,
    readabilityDistanceMultiplier: 2.5,
  },
  stockPhrases: [
    'results-driven',
    'proven track record',
    'dynamic professional',
    'fast-paced environment',
    'leveraged synergies',
    'strategic thinker',
    'detail-oriented',
    'cross-functional teams',
  ],
} as const;

type Signal = {
  value: number;
  likelihood: number;
  explanation: string;
};

export interface AiContentHeuristicResult {
  composite: number;
  detectorVersion: string;
  weightingVersion: string;
  signals: {
    sentenceLengthVariance: Signal;
    vocabularyDiversity: Signal;
    repetitiveSentenceOpeners: Signal;
    stockPhrases: Signal;
    punctuationBulletSectionRegularity: Signal;
    readability: Signal;
  };
}

@Injectable()
export class ResumeAiContentHeuristicService {
  analyze(source: string): AiContentHeuristicResult {
    const text = String(source || '').trim();
    const sentences = this.sentences(text);
    const words = this.words(text);
    const sentenceLengths = sentences.map((sentence) => this.words(sentence).length);

    const variance = this.variance(sentenceLengths);
    const diversity = words.length
      ? new Set(words.map((word) => word.toLowerCase())).size / words.length
      : 0;
    const openerRatio = this.repeatedOpenerRatio(sentences);
    const stockPhraseRate = sentences.length
      ? this.stockPhraseHits(text) / sentences.length
      : 0;
    const regularity = this.regularity(text, sentences);
    const readability = this.fleschReadingEase(words, sentences.length);

    const signals = {
      sentenceLengthVariance: this.signal(
        variance,
        100 - (variance / AI_CONTENT_HEURISTIC_CONFIG.normalization.sentenceVarianceCeiling) * 100,
        'Lower variation in sentence length raises this directional signal.',
      ),
      vocabularyDiversity: this.signal(
        diversity,
        ((AI_CONTENT_HEURISTIC_CONFIG.normalization.vocabularyDiversityHumanFloor - diversity) /
          (AI_CONTENT_HEURISTIC_CONFIG.normalization.vocabularyDiversityHumanFloor -
            AI_CONTENT_HEURISTIC_CONFIG.normalization.vocabularyDiversityAiCeiling)) *
          100,
        'Lower type-token diversity raises this directional signal.',
      ),
      repetitiveSentenceOpeners: this.signal(
        openerRatio,
        openerRatio * 100,
        'Repeated two-word sentence openings raise this directional signal.',
      ),
      stockPhrases: this.signal(
        stockPhraseRate,
        stockPhraseRate * 100,
        'Matches come only from the versioned Jobocate stock-phrase list.',
      ),
      punctuationBulletSectionRegularity: this.signal(
        regularity,
        regularity * 100,
        'Consistent punctuation, bullet lengths, and section lengths raise this signal.',
      ),
      readability: this.signal(
        readability,
        100 -
          Math.abs(
            readability - AI_CONTENT_HEURISTIC_CONFIG.normalization.readabilityCenter,
          ) * AI_CONTENT_HEURISTIC_CONFIG.normalization.readabilityDistanceMultiplier,
        'Readability near the configured business-writing center raises this signal.',
      ),
    };

    const weights = AI_CONTENT_HEURISTIC_CONFIG.weights;
    const composite = Math.round(
      signals.sentenceLengthVariance.likelihood * weights.sentenceLengthVariance +
        signals.vocabularyDiversity.likelihood * weights.vocabularyDiversity +
        signals.repetitiveSentenceOpeners.likelihood *
          weights.repetitiveSentenceOpeners +
        signals.stockPhrases.likelihood * weights.stockPhrases +
        signals.punctuationBulletSectionRegularity.likelihood *
          weights.punctuationBulletSectionRegularity +
        signals.readability.likelihood * weights.readability,
    );

    return {
      composite,
      detectorVersion: AI_CONTENT_HEURISTIC_CONFIG.detectorVersion,
      weightingVersion: AI_CONTENT_HEURISTIC_CONFIG.weightingVersion,
      signals,
    };
  }

  private signal(value: number, likelihood: number, explanation: string): Signal {
    return {
      value: this.round(value, 3),
      likelihood: Math.round(this.clamp(likelihood)),
      explanation,
    };
  }

  private words(text: string): string[] {
    return text.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || [];
  }

  private sentences(text: string): string[] {
    return text
      .split(/[.!?]+(?:\s+|$)/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  private variance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  }

  private repeatedOpenerRatio(sentences: string[]): number {
    if (sentences.length < 2) return 0;
    const counts = new Map<string, number>();
    for (const sentence of sentences) {
      const opener = this.words(sentence).slice(0, 2).join(' ').toLowerCase();
      if (opener) counts.set(opener, (counts.get(opener) || 0) + 1);
    }
    const repeats = [...counts.values()].reduce(
      (sum, count) => sum + Math.max(0, count - 1),
      0,
    );
    return repeats / sentences.length;
  }

  private stockPhraseHits(text: string): number {
    const normalized = text.toLowerCase();
    return AI_CONTENT_HEURISTIC_CONFIG.stockPhrases.reduce((hits, phrase) => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return hits + (normalized.match(new RegExp(`\\b${escaped}\\b`, 'g')) || []).length;
    }, 0);
  }

  private regularity(text: string, sentences: string[]): number {
    const endings = text.match(/[.!?](?=\s|$)/g) || [];
    const punctuationConsistency = endings.length
      ? Math.max(
          ...['.', '!', '?'].map(
            (mark) => endings.filter((ending) => ending === mark).length / endings.length,
          ),
        )
      : 0.5;

    const lines = text.split(/\r?\n/).map((line) => line.trim());
    const bulletLengths = lines
      .filter((line) => /^[-*•]\s+/.test(line))
      .map((line) => this.words(line.replace(/^[-*•]\s+/, '')).length);
    const sectionLengths = this.sectionLengths(lines);

    return (
      punctuationConsistency +
      this.lengthConsistency(bulletLengths) +
      this.lengthConsistency(sectionLengths)
    ) / 3;
  }

  private sectionLengths(lines: string[]): number[] {
    const lengths: number[] = [];
    let current = 0;
    let sawHeading = false;
    for (const line of lines) {
      if (/^#{1,6}\s+/.test(line) || /^[A-Z][A-Z\s]{2,}:?$/.test(line)) {
        if (sawHeading) lengths.push(current);
        sawHeading = true;
        current = 0;
      } else if (sawHeading) {
        current += this.words(line).length;
      }
    }
    if (sawHeading) lengths.push(current);
    return lengths;
  }

  private lengthConsistency(values: number[]): number {
    if (values.length < 2) return 0.5;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (!mean) return 1;
    return this.clamp(100 - (Math.sqrt(this.variance(values)) / mean) * 100) / 100;
  }

  private fleschReadingEase(words: string[], sentenceCount: number): number {
    if (!words.length || !sentenceCount) return 0;
    const syllables = words.reduce((sum, word) => sum + this.syllables(word), 0);
    return (
      206.835 -
      1.015 * (words.length / sentenceCount) -
      84.6 * (syllables / words.length)
    );
  }

  private syllables(word: string): number {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleaned) return 0;
    if (cleaned.length <= 3) return 1;
    const withoutSilentE = /[^aeiouy]es$/.test(cleaned)
      ? cleaned.slice(0, -2)
      : cleaned.endsWith('e')
        ? cleaned.slice(0, -1)
        : cleaned;
    return Math.max(1, (withoutSilentE.match(/[aeiouy]+/g) || []).length);
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private round(value: number, digits: number): number {
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
  }
}
