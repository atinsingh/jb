import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ModelAliasService } from '../model-alias.service';
import { HarnessModelAlias } from '../schemas/harness-model-alias.schema';
import { User } from '../../schemas/user.schema';

/**
 * The ticket's hard rule: no model id, no effort level and no tier -> model
 * mapping may appear as a literal in harness code. Everything is resolved at
 * request time from the alias collection, so adding a tier or an alias is a
 * data change, never a deploy.
 */
describe('ModelAliasService', () => {
  let service: ModelAliasService;

  // Aliases are namespaced provider + model + effort (never per harness) —
  // cost is a property of the provider serving the call.
  const PRO_ALIAS = {
    alias: 'anthropic/claude-sonnet-4-5/high',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    effort: 'high',
    label: 'Sonnet 4.5 — high effort',
    tiers: ['PRO', 'ELITE'],
    defaultForTiers: ['PRO'],
    isActive: true,
    rank: 10,
  };
  const ELITE_ALIAS = {
    alias: 'anthropic/claude-opus-4-5/max',
    provider: 'anthropic',
    model: 'claude-opus-4-5',
    effort: 'max',
    label: 'Opus 4.5 — max effort',
    tiers: ['ELITE'],
    defaultForTiers: ['ELITE'],
    isActive: true,
    rank: 5,
  };
  const LUNA_ALIASES = ['low', 'medium', 'high', 'xhigh', 'max'].map(
    (effort, rank) => ({
      alias: `openai/gpt-5.6-luna/${effort}`,
      provider: 'openai',
      model: 'gpt-5.6-luna',
      effort,
      label: `GPT-5.6 Luna · ${effort}`,
      modelLabel: 'GPT-5.6 Luna',
      tiers: ['PRO', 'ELITE'],
      defaultForTiers: [],
      isActive: true,
      rank: rank + 20,
    }),
  );

  const aliasModel = { find: jest.fn() };
  const userModel = { findById: jest.fn() };

  /** Mimics `find(...).sort(...).lean().exec()`. */
  const findReturning = (docs: any[]) => ({
    sort: () => ({ lean: () => ({ exec: async () => docs }) }),
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelAliasService,
        {
          provide: getModelToken(HarnessModelAlias.name),
          useValue: aliasModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();
    service = module.get(ModelAliasService);
  });

  const signedInAs = (tier: string | undefined) => {
    userModel.findById.mockReturnValue({
      lean: () => ({
        exec: async () => ({ _id: 'u1', currentPlanType: tier }),
      }),
    });
  };

  it('resolves the allowed alias set from the user tier at request time', async () => {
    signedInAs('ELITE');
    aliasModel.find.mockReturnValue(findReturning([ELITE_ALIAS, PRO_ALIAS]));

    const allowed = await service.listForUser('u1');

    // The tier is a query argument, not a compiled-in branch.
    expect(aliasModel.find).toHaveBeenCalledWith({
      isActive: true,
      tiers: 'ELITE',
    });
    expect(allowed.map((a) => a.alias)).toEqual([
      ELITE_ALIAS.alias,
      PRO_ALIAS.alias,
    ]);
    expect(allowed[0]).toMatchObject({ effort: 'max', provider: 'anthropic' });
  });

  it('resolves the same alias catalogue for an explicitly supplied employer model tier', async () => {
    aliasModel.find.mockReturnValue(findReturning([PRO_ALIAS]));

    const allowed = await service.listForTier('PRO');
    const resolved = await service.resolveForTier('PRO');

    expect(aliasModel.find).toHaveBeenCalledWith({
      isActive: true,
      tiers: 'PRO',
    });
    expect(allowed.map((a) => a.alias)).toEqual([PRO_ALIAS.alias]);
    expect(resolved).toMatchObject({ alias: PRO_ALIAS.alias, tier: 'PRO' });
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('falls back to the FREE tier when the user has no plan set', async () => {
    signedInAs(undefined);
    aliasModel.find.mockReturnValue(findReturning([]));

    await service.listForUser('u1').catch(() => undefined);

    expect(aliasModel.find).toHaveBeenCalledWith({
      isActive: true,
      tiers: 'FREE',
    });
  });

  it('picks the tier default when the caller does not name an alias', async () => {
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning([PRO_ALIAS]));

    const resolved = await service.resolveForUser('u1');

    expect(resolved.alias).toBe(PRO_ALIAS.alias);
    expect(resolved.effort).toBe('high');
  });

  it('exposes Luna effort capabilities without leaking provider aliases', async () => {
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning(LUNA_ALIASES));

    const capabilities = await (service as any).capabilitiesForUser('u1');

    expect(capabilities).toEqual([
      {
        model: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        efforts: ['low', 'medium', 'high', 'xhigh', 'max'],
      },
    ]);
    expect(capabilities[0]).not.toHaveProperty('provider');
    expect(capabilities[0]).not.toHaveProperty('alias');
  });

  it('resolves the exact model and supported effort selected by the user', async () => {
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning(LUNA_ALIASES));

    const resolved = await (service as any).resolveSelectionForUser(
      'u1',
      'gpt-5.6-luna',
      'xhigh',
    );

    expect(resolved).toMatchObject({
      alias: 'openai/gpt-5.6-luna/xhigh',
      provider: 'openai',
      model: 'gpt-5.6-luna',
      effort: 'xhigh',
      tier: 'PRO',
    });
  });

  it('rejects an unsupported Luna effort with the supported values', async () => {
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning(LUNA_ALIASES));

    await expect(
      (service as any).resolveSelectionForUser('u1', 'gpt-5.6-luna', 'minimal'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      (service as any).resolveSelectionForUser('u1', 'gpt-5.6-luna', 'minimal'),
    ).rejects.toThrow(
      'Effort "minimal" is not supported for gpt-5.6-luna. Supported: low, medium, high, xhigh, max.',
    );
  });

  it('rejects an out-of-tier alias instead of silently downgrading', async () => {
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning([PRO_ALIAS]));

    await expect(
      service.resolveForUser('u1', ELITE_ALIAS.alias),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // And specifically NOT resolved to the permitted one.
    await expect(
      service.resolveForUser('u1', ELITE_ALIAS.alias),
    ).rejects.toThrow(/not available on your plan/i);
  });

  it('rejects when the tier permits nothing rather than inventing a default', async () => {
    signedInAs('FREE');
    aliasModel.find.mockReturnValue(findReturning([]));

    await expect(service.resolveForUser('u1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not offer leftover Llama rows still marked active in Mongo', async () => {
    // LiteLLM and the seed no longer serve Llama. Old alias documents stay
    // isActive until someone re-seeds; the picker must not wait on that.
    const llama = {
      alias: 'bedrock/llama3-3-70b/low',
      provider: 'bedrock',
      model: 'llama3-3-70b',
      effort: 'low',
      label: 'Llama 3.3 70B · low cost',
      tiers: ['PRO', 'ELITE'],
      defaultForTiers: ['PRO'],
      isActive: true,
      rank: 1,
    };
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning([llama, PRO_ALIAS]));

    const allowed = await service.listForUser('u1');
    expect(allowed.map((a) => a.alias)).toEqual([PRO_ALIAS.alias]);

    await expect(service.resolveForUser('u1', llama.alias)).rejects.toThrow(
      /not available on your plan/i,
    );

    const resolved = await service.resolveForUser('u1');
    expect(resolved.alias).toBe(PRO_ALIAS.alias);
  });

  it('offers seeded Claude aliases, including Bedrock-backed rows', async () => {
    const claude = {
      alias: 'anthropic/claude-sonnet-4-5/high',
      provider: 'anthropic',
      model: 'claude-sonnet-4-5',
      effort: 'high',
      label: 'Sonnet 4.5 · thorough',
      tiers: ['PRO', 'ELITE'],
      defaultForTiers: ['PRO'],
      isActive: true,
      rank: 1,
    };
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning([claude]));

    const allowed = await service.listForUser('u1');
    expect(allowed.map((a) => a.alias)).toEqual([claude.alias]);
  });

  it('contains no hardcoded model id, effort level or tier->model mapping', () => {
    const source = readFileSync(
      join(__dirname, '..', 'model-alias.service.ts'),
      'utf8',
    );
    // Strip comments — prose may legitimately mention an example model.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const modelIdLike =
      /['"`][a-z0-9.]*(claude|gpt|gemini|llama|mistral|opus|sonnet|haiku|codex|o[34]-mini)[a-z0-9.\-/]*['"`]/i;
    expect(code).not.toMatch(modelIdLike);

    // Effort levels must arrive from the alias record, never be enumerated here.
    expect(code).not.toMatch(/['"`](minimal|low|medium|high|max)['"`]/i);

    // No tier is named in code except the FREE floor used when a user has no
    // plan at all, which is an auth default rather than a model mapping.
    const tierLiterals =
      code.match(/['"`](FREE|PRO|ELITE|INTERVIEW)['"`]/g) || [];
    expect(tierLiterals).toEqual(["'FREE'"]);
  });
});
