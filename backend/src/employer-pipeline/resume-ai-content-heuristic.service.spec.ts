import {
  AI_CONTENT_HEURISTIC_CONFIG,
  ResumeAiContentHeuristicService,
} from './resume-ai-content-heuristic.service';

describe('ResumeAiContentHeuristicService', () => {
  const service = new ResumeAiContentHeuristicService();

  it('returns all six explainable signals and the documented weighted composite', () => {
    const result = service.analyze(
      'We deliver results. We deliver outcomes. We deliver value.',
    );

    expect(result.detectorVersion).toBe('jobocate-heuristic-v1');
    expect(result.weightingVersion).toBe('weights-v1');
    expect(result.signals).toEqual({
      sentenceLengthVariance: expect.objectContaining({ value: 0, likelihood: 100 }),
      vocabularyDiversity: expect.objectContaining({ value: 0.556, likelihood: 43 }),
      repetitiveSentenceOpeners: expect.objectContaining({ value: 0.667, likelihood: 67 }),
      stockPhrases: expect.objectContaining({ value: 0, likelihood: 0 }),
      punctuationBulletSectionRegularity: expect.objectContaining({
        value: 0.667,
        likelihood: 67,
      }),
      readability: expect.objectContaining({ value: 34.59, likelihood: 36 }),
    });
    expect(result.composite).toBe(54);
    expect(AI_CONTENT_HEURISTIC_CONFIG.weights).toEqual({
      sentenceLengthVariance: 0.22,
      vocabularyDiversity: 0.18,
      repetitiveSentenceOpeners: 0.16,
      stockPhrases: 0.18,
      punctuationBulletSectionRegularity: 0.14,
      readability: 0.12,
    });
  });

  it('detects each signal from deterministic text fixtures without external calls', () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => {
      throw new Error('network access is forbidden');
    }) as any;

    try {
      const uniform = service.analyze(
        [
          'Results-driven professional with a proven track record.',
          'Results-driven professional with a proven track record.',
          'Results-driven professional with a proven track record.',
          '## Experience',
          '- Built stable systems.',
          '- Led capable teams.',
        ].join('\n'),
      );
      const varied = service.analyze(
        'I build APIs. During a difficult migration, I coordinated six teams across three time zones and reduced failed deploys by forty percent! Why? Careful testing.',
      );

      expect(uniform.signals.sentenceLengthVariance.likelihood).toBeGreaterThan(
        varied.signals.sentenceLengthVariance.likelihood,
      );
      expect(uniform.signals.vocabularyDiversity.likelihood).toBeGreaterThan(
        varied.signals.vocabularyDiversity.likelihood,
      );
      expect(uniform.signals.repetitiveSentenceOpeners.likelihood).toBeGreaterThan(0);
      expect(uniform.signals.stockPhrases.likelihood).toBeGreaterThan(0);
      expect(
        uniform.signals.punctuationBulletSectionRegularity.likelihood,
      ).toBeGreaterThan(
        varied.signals.punctuationBulletSectionRegularity.likelihood,
      );
      expect(uniform.signals.readability.value).toEqual(expect.any(Number));
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
