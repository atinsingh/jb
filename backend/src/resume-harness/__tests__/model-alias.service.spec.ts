import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
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
        { provide: getModelToken(HarnessModelAlias.name), useValue: aliasModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();
    service = module.get(ModelAliasService);
  });

  const signedInAs = (tier: string | undefined) => {
    userModel.findById.mockReturnValue({
      lean: () => ({ exec: async () => ({ _id: 'u1', currentPlanType: tier }) }),
    });
  };

  it('resolves the allowed alias set from the user tier at request time', async () => {
    signedInAs('ELITE');
    aliasModel.find.mockReturnValue(findReturning([ELITE_ALIAS, PRO_ALIAS]));

    const allowed = await service.listForUser('u1');

    // The tier is a query argument, not a compiled-in branch.
    expect(aliasModel.find).toHaveBeenCalledWith({ isActive: true, tiers: 'ELITE' });
    expect(allowed.map((a) => a.alias)).toEqual([
      ELITE_ALIAS.alias,
      PRO_ALIAS.alias,
    ]);
    expect(allowed[0]).toMatchObject({ effort: 'max', provider: 'anthropic' });
  });

  it('falls back to the FREE tier when the user has no plan set', async () => {
    signedInAs(undefined);
    aliasModel.find.mockReturnValue(findReturning([]));

    await service.listForUser('u1').catch(() => undefined);

    expect(aliasModel.find).toHaveBeenCalledWith({ isActive: true, tiers: 'FREE' });
  });

  it('picks the tier default when the caller does not name an alias', async () => {
    signedInAs('PRO');
    aliasModel.find.mockReturnValue(findReturning([PRO_ALIAS]));

    const resolved = await service.resolveForUser('u1');

    expect(resolved.alias).toBe(PRO_ALIAS.alias);
    expect(resolved.effort).toBe('high');
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
    const tierLiterals = code.match(/['"`](FREE|PRO|ELITE|INTERVIEW)['"`]/g) || [];
    expect(tierLiterals).toEqual(["'FREE'"]);
  });
});
