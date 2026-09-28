import { LLMQuotaService } from '../llm-quota.service';
import { LLMFeature } from '../llm-routing.service';

describe('LLMQuotaService measured owner allowance', () => {
  const budget = { statusOwner: jest.fn() };
  const accounting = { recordUsage: jest.fn() };
  let service: LLMQuotaService;
  beforeEach(() => {
    jest.clearAllMocks();
    budget.statusOwner.mockResolvedValue({ limit: 50, spent: 7, remaining: 43, status: 'healthy' });
    service = new (LLMQuotaService as any)(budget, accounting);
  });
  it.each([[LLMFeature.REWRITE_BULLETS, 'candidate'], [LLMFeature.RECRUITER_COPILOT, 'employer']])('reads only the measured allowance for %s', async (feature, ownerType) => {
    expect(await service.checkQuota('owner-1', feature as LLMFeature)).toMatchObject({ allowed: true, limit: 50, used: 7, remaining: 43 });
    expect(budget.statusOwner).toHaveBeenCalledWith(ownerType, 'owner-1');
  });
  it.each(['exhausted', 'unavailable'])('does not dispatch in the %s state', async (status) => {
    budget.statusOwner.mockResolvedValue({ limit: 50, spent: 50, remaining: 0, status });
    await expect(service.enforceQuota('owner-1', LLMFeature.REWRITE_BULLETS)).rejects.toThrow();
  });
});
