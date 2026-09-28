import { reconcileCandidatePlans } from '../candidate-plan-catalog';

describe('candidate plan catalogue reconciliation', () => {
  const stripe = {
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
  };

  it('upserts exactly Free and Paid, retires legacy tiers, and is idempotent', async () => {
    const plans = new Map<string, any>([
      ['FREE', { _id: 'free-id', type: 'FREE', name: 'Old Free', isActive: true }],
      ['ELITE', { _id: 'elite-id', type: 'ELITE', name: 'Elite', isActive: true }],
      ['INTERVIEW', { _id: 'interview-id', type: 'INTERVIEW', name: 'Interview', isActive: true }],
    ]);
    const entitlements = new Map<string, any>([
      ['free-id:stale_feature', { planId: 'free-id', featureKey: 'stale_feature' }],
    ]);

    const planModel = {
      findOneAndUpdate: jest.fn(async (filter, update) => {
        const current = plans.get(filter.type) || { _id: `${filter.type.toLowerCase()}-id` };
        const next = { ...current, ...update.$set };
        plans.set(filter.type, next);
        return next;
      }),
      updateMany: jest.fn(async (filter, update) => {
        for (const plan of plans.values()) {
          if (!filter.type.$in.includes(plan.type)) continue;
          Object.assign(plan, update.$set);
        }
      }),
    };
    const entitlementModel = {
      updateOne: jest.fn(async (filter, update) => {
        entitlements.set(`${filter.planId}:${filter.featureKey}`, {
          ...update.$set,
          planId: filter.planId,
          featureKey: filter.featureKey,
        });
      }),
      deleteMany: jest.fn(async (filter) => {
        for (const key of [...entitlements.keys()]) {
          const item = entitlements.get(key);
          if (String(item.planId) === String(filter.planId) && !filter.featureKey.$nin.includes(item.featureKey)) {
            entitlements.delete(key);
          }
        }
      }),
    };

    await reconcileCandidatePlans(planModel as any, entitlementModel as any, stripe);
    await reconcileCandidatePlans(planModel as any, entitlementModel as any, stripe);

    expect([...plans.values()].filter((plan) => plan.isActive).map((plan) => plan.type)).toEqual([
      'FREE',
      'PRO',
    ]);
    expect(plans.get('FREE')).toMatchObject({ name: 'Free', priceMonthly: 0, priceYearly: 0 });
    expect(plans.get('PRO')).toMatchObject({
      name: 'Paid',
      priceMonthly: 10,
      priceYearly: 100,
      stripePriceIdMonthly: stripe.monthly.priceId,
      stripePriceIdYearly: stripe.yearly.priceId,
    });
    expect(plans.get('ELITE').isActive).toBe(false);
    expect(plans.get('INTERVIEW').isActive).toBe(false);
    expect(entitlements.has('free-id:stale_feature')).toBe(false);
    expect([...entitlements.values()].some(item => item.featureKey === 'ai_credits_per_month')).toBe(false);
    expect(new Set(entitlements.keys()).size).toBe(entitlements.size);
    expect(planModel.findOneAndUpdate).toHaveBeenCalledTimes(4);
  });
});
