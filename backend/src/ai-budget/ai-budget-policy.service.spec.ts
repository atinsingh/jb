import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  AiBudgetPolicyService,
  parseAiBudgetPolicy,
} from './ai-budget-policy.service';

const COMPLETE_POLICY = {
  version: 1,
  currency: 'USD',
  lowRemainingRatio: 0.2,
  tiers: {
    FREE: { maxBudgetUsd: 0.5, budgetDuration: '1mo' },
    PRO: { maxBudgetUsd: 4, budgetDuration: '1mo' },
  },
  services: [
    {
      id: 'resume_agent_turn',
      enabled: true,
      metered: true,
      ownerType: 'candidate',
      pool: 'candidate-ai',
    },
    {
      id: 'resume_look_change',
      enabled: true,
      metered: true,
      ownerType: 'candidate',
      pool: 'candidate-ai',
    },
    {
      id: 'candidate_ats_review',
      enabled: false,
      metered: true,
      ownerType: 'candidate',
      pool: 'candidate-ai',
    },
    {
      id: 'employer_ats_review',
      enabled: false,
      metered: true,
      ownerType: 'employer',
      pool: 'employer-ai',
    },
    {
      id: 'ai_content_heuristic',
      enabled: true,
      metered: false,
    },
  ],
  estimates: [
    {
      alias: 'bedrock/nova-2-lite/low',
      service: 'resume_agent_turn',
      kind: 'range',
      minUsd: 0.01,
      maxUsd: 0.08,
      label: '$0.01-$0.08 estimated',
    },
    {
      alias: 'anthropic/claude-sonnet-4-6/high',
      service: 'resume_agent_turn',
      kind: 'usage_based',
      label: 'Usage based',
    },
  ],
  stripe: {
    paid: {
      monthly: {
        productId: 'prod_VAucq8N2hh10sb',
        priceId: 'price_1UAYnMGD4YhJNu0gYLmLjYsb',
        amountUsd: 10,
      },
      yearly: {
        productId: 'prod_VAue1EgKKX8FIz',
        priceId: 'price_1UAYoyGD4YhJNu0gFPMaEQZH',
        amountUsd: 100,
      },
    },
  },
};

const clonePolicy = () => structuredClone(COMPLETE_POLICY) as any;

describe('AI budget policy', () => {
  it('normalizes the approved tiers, service map, and Stripe catalogue', () => {
    const policy = parseAiBudgetPolicy(COMPLETE_POLICY);

    expect(policy.tiers.FREE).toEqual({
      maxBudgetUsd: 0.5,
      budgetDuration: '1mo',
    });
    expect(policy.tiers.PRO).toEqual({
      maxBudgetUsd: 4,
      budgetDuration: '1mo',
    });
    expect(policy.services.ai_content_heuristic.metered).toBe(false);
    expect(policy.services.candidate_ats_review.enabled).toBe(false);
    expect(policy.stripe.paid.yearly.priceId).toBe(
      'price_1UAYoyGD4YhJNu0gFPMaEQZH',
    );
  });

  it.each([
    ['non-USD currency', (p: any) => (p.currency = 'CAD')],
    ['zero tier limit', (p: any) => (p.tiers.FREE.maxBudgetUsd = 0)],
    ['negative tier limit', (p: any) => (p.tiers.PRO.maxBudgetUsd = -1)],
    ['duplicate service id', (p: any) => p.services.push({ ...p.services[0] })],
    ['missing service id', (p: any) => delete p.services[0].id],
    [
      'missing required service',
      (p: any) =>
        (p.services = p.services.filter(
          (service: any) => service.id !== 'employer_ats_review',
        )),
    ],
    [
      'exact fixed charge',
      (p: any) => (p.estimates[0] = { ...p.estimates[0], fixedUsd: 0.03 }),
    ],
    [
      'inverted estimate range',
      (p: any) => {
        p.estimates[0].minUsd = 0.09;
        p.estimates[0].maxUsd = 0.08;
      },
    ],
  ])('rejects %s', (_label, mutate) => {
    const policy = clonePolicy();
    mutate(policy);

    expect(() => parseAiBudgetPolicy(policy)).toThrow();
  });

  it('rejects an estimate alias that is absent from LiteLLM config', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ai-budget-policy-'));
    const policyPath = join(directory, 'ai-budget.yaml');
    const policy = clonePolicy();
    policy.estimates[0].alias = 'missing/provider-model/low';
    writeFileSync(policyPath, JSON.stringify(policy));

    try {
      expect(() => new AiBudgetPolicyService(policyPath)).toThrow(
        /missing\/provider-model\/low/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('serves immutable tier, service, and estimate lookups with a usage fallback', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ai-budget-policy-'));
    const policyPath = join(directory, 'ai-budget.yaml');
    writeFileSync(policyPath, JSON.stringify(COMPLETE_POLICY));

    try {
      const service = new AiBudgetPolicyService(policyPath);

      expect(service.tier('FREE').maxBudgetUsd).toBe(0.5);
      expect(service.service('resume_agent_turn').pool).toBe('candidate-ai');
      expect(
        service.estimate('bedrock/nova-2-lite/low', 'resume_agent_turn'),
      ).toEqual({
        kind: 'range',
        minUsd: 0.01,
        maxUsd: 0.08,
        label: '$0.01-$0.08 estimated',
      });
      expect(
        service.estimate('openai/gpt-5.6-luna/medium', 'resume_agent_turn'),
      ).toEqual({ kind: 'usage_based', label: 'Usage based' });
      expect(() => ((service.tier('FREE') as any).maxBudgetUsd = 99)).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
