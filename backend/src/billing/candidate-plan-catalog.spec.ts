import { EMPLOYER_PLANS } from '../employer-billing/employer-plans';

describe('single AI allowance in plan configuration', () => {
  it('has no separate AI action allowance for candidates or employers', () => {
    for (const plan of EMPLOYER_PLANS) expect(plan.limits).not.toHaveProperty('aiActionsLimit');
    expect(EMPLOYER_PLANS.map(p => p.limits.aiBudgetCreditsLimit)).toEqual([100, 400]);
  });
});
