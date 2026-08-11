import { ClaimsReviewService } from './claims-review.service';
import { LLMFeature } from './llm-routing.service';

/**
 * The anti-fabrication guardrail.
 *
 * `detectUnverifiableClaims` runs over MODEL-GENERATED résumé text and decides
 * what a human must confirm before it goes on their CV. It had no tests, and it
 * was missing the standard résumé phrasing: the improvement pattern required the
 * verb to be immediately followed by "by"/"to" (`reduced by 40%`), while real
 * bullets name the metric in between (`reduced payment latency by 40%`).
 *
 * The fixtures below are the literal output the rewrite endpoint produced from
 * the input "Worked on the payments backend and made it faster" — four invented
 * statistics, none of which the candidate ever claimed, all of which the
 * detector let through.
 */
describe('ClaimsReviewService.detectUnverifiableClaims', () => {
  let service: ClaimsReviewService;

  beforeEach(() => {
    // Detection is pure text analysis; persistence is a separate method.
    service = new ClaimsReviewService({} as any);
  });

  const detect = (text: string) =>
    service.detectUnverifiableClaims(text, LLMFeature.REWRITE_BULLETS);

  const claimText = (claims: any[]) => claims.map((c) => c.claim).join(' | ');

  describe('the metric-in-the-middle phrasing that real bullets use', () => {
    it('catches a percentage claim with the metric named between verb and "by"', async () => {
      const claims = await detect(
        'Reduced payment processing latency by 40% through backend optimization',
      );

      expect(claims.length).toBeGreaterThan(0);
      expect(claimText(claims)).toMatch(/40%/);
    });

    it('catches the -ing verb form', async () => {
      const claims = await detect('improving transaction throughput by 25%');

      expect(claims.length).toBeGreaterThan(0);
      expect(claimText(claims)).toMatch(/25%/);
    });

    it('still catches the original adjacent form', async () => {
      const claims = await detect('Increased by 40%');

      expect(claims.length).toBeGreaterThan(0);
    });

    // Observed live: the same model that produced the verb forms also produced
    // "a 25% reduction in latency and a 15% decrease in error rates", which
    // shares no structure with the verb pattern.
    it('catches the noun-phrase form models reach for constantly', async () => {
      const claims = await detect(
        'Led a redesign of the payments backend, resulting in a 25% reduction in latency and a 15% decrease in error rates',
      );

      const joined = claimText(claims);
      expect(joined).toMatch(/25/);
      expect(joined).toMatch(/15/);
    });
  });

  describe('bare scale claims that carry no verb', () => {
    it('catches an uptime figure', async () => {
      const claims = await detect('99.99% uptime across all regions');

      expect(claims.length).toBeGreaterThan(0);
      expect(claimText(claims)).toMatch(/99\.99/);
    });

    it('catches a throughput figure', async () => {
      const claims = await detect('supporting 100,000+ transactions per minute');

      expect(claims.length).toBeGreaterThan(0);
      expect(claimText(claims)).toMatch(/100,000/);
    });
  });

  it('flags every invented statistic in the real generated bullet', async () => {
    const generated =
      'Reduced payment processing latency by 40% through backend optimization, improving transaction throughput by 25%. ' +
      'Implemented scalable payment processing architecture, supporting 100,000+ transactions per minute with 99.99% uptime';

    const claims = await detect(generated);
    const joined = claimText(claims);

    expect(joined).toMatch(/40%/);
    expect(joined).toMatch(/25%/);
    expect(joined).toMatch(/100,000/);
    expect(joined).toMatch(/99\.99/);
  });

  describe('the other claim families', () => {
    it('catches financial impact', async () => {
      const claims = await detect('Saved $2,400,000 in infrastructure spend');

      expect(claims.length).toBeGreaterThan(0);
    });

    it('catches leadership headcount, including cross-functional phrasing', async () => {
      const claims = await detect('Led a cross-functional team of 12 engineers');

      expect(claims.length).toBeGreaterThan(0);
    });

    it('catches awards and promotions', async () => {
      const claims = await detect('Promoted to Staff Engineer in under two years');

      expect(claims.length).toBeGreaterThan(0);
    });
  });

  describe('what it must NOT flag', () => {
    it('leaves unquantified factual description alone', async () => {
      const claims = await detect(
        'Worked on the payments backend and made it faster',
      );

      expect(claims).toEqual([]);
    });

    it('leaves technology lists alone', async () => {
      const claims = await detect(
        'Built services in Node.js and TypeScript, deployed on Kubernetes',
      );

      expect(claims).toEqual([]);
    });

    it('handles empty input without throwing', async () => {
      await expect(detect('')).resolves.toEqual([]);
    });
  });

  it('does not surface the same claim twice when patterns overlap', async () => {
    const claims = await detect('Reduced latency by 40% and improved uptime by 40%');

    const keys = claims.map((c) => `${c.originalText}::${c.claim.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
