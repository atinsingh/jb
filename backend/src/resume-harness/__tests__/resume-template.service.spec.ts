import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeTemplateService } from '../resume-template.service';
import { ResumeTemplate } from '../schemas/resume-template.schema';

/**
 * Templates are data, and the look is a set of choices over that data.
 *
 * These tests pin the two rules that keep it that way: a knob value the
 * template did not declare is rejected rather than passed through to the
 * harness, and the directives handed to the context files come from the
 * template document rather than from anything written here.
 */

const CLASSIC: any = {
  key: 'classic-serif',
  name: 'Classic Serif',
  description: 'Traditional, centred header.',
  previewSvg: '<svg/>',
  skeleton: '\\documentclass{article}\n% classic\n',
  constraints: ['Keep the centred header block.'],
  knobs: [
    {
      key: 'density',
      label: 'Density',
      defaultValue: 'balanced',
      options: [
        { value: 'compact', label: 'Compact', directive: 'Tighten spacing.' },
        { value: 'balanced', label: 'Balanced', directive: 'Keep default spacing.' },
      ],
    },
    {
      key: 'accent',
      label: 'Accent',
      defaultValue: 'none',
      options: [
        { value: 'none', label: 'None', directive: 'Black text throughout.' },
        { value: 'navy', label: 'Navy', directive: 'Use the navy accent.' },
      ],
    },
  ],
  rank: 10,
  isActive: true,
};

const MODERN: any = {
  ...CLASSIC,
  key: 'modern-sans',
  name: 'Modern Sans',
  skeleton: '\\documentclass{article}\n% modern\n',
  constraints: ['Keep the left-aligned rule under the name.'],
  // Deliberately a different knob set: switching template must not carry a
  // knob the new template never declared.
  knobs: [
    {
      key: 'density',
      label: 'Density',
      defaultValue: 'compact',
      options: [
        { value: 'compact', label: 'Compact', directive: 'Tighten spacing.' },
        { value: 'airy', label: 'Airy', directive: 'Open the spacing up.' },
      ],
    },
  ],
  rank: 20,
};

describe('ResumeTemplateService', () => {
  let service: ResumeTemplateService;
  let docs: any[];

  const model: any = {
    find: jest.fn(() => ({
      sort: () => ({ lean: () => ({ exec: async () => docs.filter((d) => d.isActive) }) }),
    })),
    findOne: jest.fn((q: any) => ({
      lean: () => ({
        exec: async () => docs.find((d) => d.key === q.key && d.isActive) || null,
      }),
    })),
  };

  beforeEach(async () => {
    docs = [CLASSIC, MODERN];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeTemplateService,
        { provide: getModelToken(ResumeTemplate.name), useValue: model },
      ],
    }).compile();

    service = module.get(ResumeTemplateService);
  });

  it('lists active templates with previews and knob definitions', async () => {
    const list = await service.list();
    expect(list.map((t) => t.key)).toEqual(['classic-serif', 'modern-sans']);
    expect(list[0].previewSvg).toBeTruthy();
    expect(list[0].knobs[0].options.map((o) => o.value)).toEqual([
      'compact',
      'balanced',
    ]);
    // The skeleton is a sandbox file, not something the browser needs.
    expect((list[0] as any).skeleton).toBeUndefined();
  });

  it('falls back to the lowest-ranked template when the caller names none', async () => {
    const { template, vibe } = await service.resolve(undefined, undefined);
    expect(template.key).toBe('classic-serif');
    // Every knob resolves to its declared default rather than being absent.
    expect(vibe).toEqual({ density: 'balanced', accent: 'none' });
  });

  it('rejects an unknown template instead of silently defaulting', async () => {
    await expect(service.resolve('no-such-template', undefined)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a knob value the template never declared', async () => {
    await expect(
      service.resolve('classic-serif', { density: 'enormous' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.resolve('classic-serif', { curvature: 'round' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('carries the previous look forward but drops knobs the new template lacks', async () => {
    const { template, vibe } = await service.resolve('modern-sans', undefined, {
      templateKey: 'classic-serif',
      vibe: { density: 'compact', accent: 'navy' },
    });

    expect(template.key).toBe('modern-sans');
    // density exists on both templates and survives the switch.
    expect(vibe.density).toBe('compact');
    // accent is not a knob on modern-sans, so it does not reach the harness.
    expect(vibe.accent).toBeUndefined();
  });

  it('turns the resolved look into directives written by the template, not by code', async () => {
    const { template, vibe } = await service.resolve('classic-serif', {
      accent: 'navy',
    });
    const condition = service.condition(template, vibe);

    expect(condition.key).toBe('classic-serif');
    expect(condition.skeleton).toContain('% classic');
    expect(condition.constraints).toEqual(['Keep the centred header block.']);

    const accent = condition.look.find((l) => l.key === 'accent')!;
    expect(accent.choice).toBe('navy');
    expect(accent.directive).toBe('Use the navy accent.');
  });
});
