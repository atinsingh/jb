import { ConfigService } from '@nestjs/config';
import {
  JobDescriptionGeneratorService,
  JobDescriptionResponseSchema,
} from './job-description-generator.service';
import { LLMFeature } from '../llm-routing.service';

/**
 * A model asked to write a job posting will happily invent traction it was
 * never given ("serving millions of users", specific headcounts, funding
 * rounds) because that is what confident marketing copy sounds like. Unlike a
 * résumé bullet, there's no prior fact for the model to misrepresent — but an
 * employer publishing an invented user count is still a real problem, just
 * the employer's rather than a candidate's. These tests pin the prompt
 * contract (never invent company facts) and the response shape.
 */
describe('JobDescriptionGeneratorService', () => {
  const buildService = (chatResponse: any, configOverrides: Record<string, any> = {}) => {
    const chat = jest.fn().mockResolvedValue(chatResponse);
    const provider = { getName: () => 'mock', chat };
    const routingService: any = {
      getProviderForFeature: jest.fn().mockReturnValue(provider),
      getFeatureConfig: jest.fn().mockReturnValue({
        model: 'test-model',
        temperature: 0.6,
        maxTokens: 1500,
        ...configOverrides,
      }),
    };
    const quotaService: any = {
      enforceQuota: jest.fn(),
      recordUsageAndIncrement: jest.fn(),
    };
    const configService = {
      get: jest.fn().mockReturnValue('false'), // LLM_ENFORCE_QUOTA off by default
    } as unknown as ConfigService;

    const service = new JobDescriptionGeneratorService(
      routingService,
      quotaService,
      configService,
    );

    return { service, chat, routingService, quotaService };
  };

  const validDraft = {
    description: 'A role description.',
    responsibilities: ['Ship features'],
    requirements: ['5+ years experience'],
    benefits: [],
    confidence: 0.85,
  };

  it('routes to the GENERATE_JOB_DESCRIPTION feature, not a generic one', async () => {
    const { service, routingService } = buildService({
      content: JSON.stringify(validDraft),
      usage: {},
    });

    await service.generate('user-1', { title: 'Staff Engineer' });

    expect(routingService.getProviderForFeature).toHaveBeenCalledWith(
      LLMFeature.GENERATE_JOB_DESCRIPTION,
    );
    expect(routingService.getFeatureConfig).toHaveBeenCalledWith(
      LLMFeature.GENERATE_JOB_DESCRIPTION,
    );
  });

  it('instructs the model never to invent company facts or traction claims', async () => {
    const { service, chat } = buildService({
      content: JSON.stringify(validDraft),
      usage: {},
    });

    await service.generate('user-1', { title: 'Staff Engineer' });

    const systemMessage = chat.mock.calls[0][0].messages[0];
    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toMatch(/never invent a company fact/i);
    expect(systemMessage.content).toMatch(/user\/customer counts/i);
  });

  it('passes only the facts given as the seed — no fields the employer never entered', async () => {
    const { service, chat } = buildService({
      content: JSON.stringify(validDraft),
      usage: {},
    });

    await service.generate('user-1', { title: 'Staff Engineer' });

    const userMessage = chat.mock.calls[0][0].messages[1];
    expect(userMessage.content).toContain('Staff Engineer');
    // No company was given, so none should be fabricated into the prompt.
    expect(userMessage.content).not.toMatch(/Company:/);
  });

  it('includes every seed field the employer actually provided', async () => {
    const { service, chat } = buildService({
      content: JSON.stringify(validDraft),
      usage: {},
    });

    await service.generate('user-1', {
      title: 'Staff Engineer',
      companyName: 'Hopper Labs',
      location: 'Toronto, Ontario, Canada',
      isRemote: false,
      skills: ['Node.js', 'TypeScript'],
      notes: 'Team also owns the payments pipeline',
    });

    const userMessage = chat.mock.calls[0][0].messages[1].content;
    expect(userMessage).toContain('Hopper Labs');
    expect(userMessage).toContain('Toronto, Ontario, Canada');
    expect(userMessage).toContain('Node.js, TypeScript');
    expect(userMessage).toContain('payments pipeline');
  });

  it('returns the validated draft matching the form fields it will populate', async () => {
    const { service } = buildService({
      content: JSON.stringify(validDraft),
      usage: {},
    });

    const result = await service.generate('user-1', { title: 'Staff Engineer' });

    expect(result).toEqual(validDraft);
  });

  it('recovers JSON wrapped in a markdown code fence', async () => {
    const { service } = buildService({
      content: '```json\n' + JSON.stringify(validDraft) + '\n```',
      usage: {},
    });

    const result = await service.generate('user-1', { title: 'Staff Engineer' });

    expect(result).toEqual(validDraft);
  });

  it('rejects a response missing a required field rather than returning it half-formed', async () => {
    const { service } = buildService({
      content: JSON.stringify({ description: 'Only a description, nothing else.' }),
      usage: {},
    });

    await expect(
      service.generate('user-1', { title: 'Staff Engineer' }),
    ).rejects.toThrow(/Invalid response format/);
  });

  it('meters usage against the employer AI pool via the same feature key it routed on', async () => {
    const { service, quotaService } = buildService({
      content: JSON.stringify(validDraft),
      usage: { promptTokens: 10, completionTokens: 20 },
    });

    await service.generate('user-1', {
      title: 'Staff Engineer',
      companyName: 'Hopper Labs',
    });

    expect(quotaService.recordUsageAndIncrement).toHaveBeenCalledWith(
      'user-1',
      LLMFeature.GENERATE_JOB_DESCRIPTION,
      'mock',
      'test-model',
      { promptTokens: 10, completionTokens: 20 },
      expect.objectContaining({ jobTitle: 'Staff Engineer', companyName: 'Hopper Labs' }),
    );
  });

  it('enforces quota only when LLM_ENFORCE_QUOTA is on', async () => {
    const { service, quotaService } = buildService(
      { content: JSON.stringify(validDraft), usage: {} },
    );

    await service.generate('user-1', { title: 'Staff Engineer' });

    expect(quotaService.enforceQuota).not.toHaveBeenCalled();
  });
});

describe('JobDescriptionResponseSchema', () => {
  it('defaults benefits to being required as an array, not optional — an empty draft still has the key', () => {
    const parsed = JobDescriptionResponseSchema.parse({
      description: 'x',
      responsibilities: [],
      requirements: [],
      benefits: [],
    });

    expect(parsed.benefits).toEqual([]);
  });

  it('rejects a response with no requirements array at all', () => {
    expect(() =>
      JobDescriptionResponseSchema.parse({
        description: 'x',
        responsibilities: [],
        benefits: [],
      }),
    ).toThrow();
  });
});
