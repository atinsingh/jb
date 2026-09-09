import { connect, connection, model } from 'mongoose';
import {
  ResumeTemplate,
  ResumeTemplateSchema,
} from '../src/resume-harness/schemas/resume-template.schema';
import {
  DEFAULT_RESUME_TEMPLATES,
  seedResumeTemplates,
} from '../src/resume-harness/templates/resume-templates.seed';

/**
 * The default templates exist only as the product of the seed.
 *
 * The two properties that matter are re-runnability and in-place update: the
 * seed is how a template body changes, so running it twice must leave exactly
 * one of each, and editing a skeleton then re-running must replace that
 * skeleton rather than append a second document.
 *
 * This runs against the e2e database rather than a mock because idempotency is
 * a property of the upsert against a real unique index, not of the array above.
 */
describe('Resume template seed (e2e)', () => {
  let TemplateModel: any;

  beforeAll(async () => {
    await connect(process.env.MONGODB_URI!);
    TemplateModel = model(ResumeTemplate.name, ResumeTemplateSchema);
    await TemplateModel.collection.drop().catch(() => undefined);
    await TemplateModel.syncIndexes();
  });

  afterAll(async () => {
    await connection.close();
  });

  it('ships more than one template, so the picker is a real choice', () => {
    expect(DEFAULT_RESUME_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const keys = DEFAULT_RESUME_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every template a compiling-shaped skeleton, a preview and usable knobs', () => {
    for (const t of DEFAULT_RESUME_TEMPLATES) {
      expect(t.skeleton).toContain('\\documentclass');
      expect(t.skeleton).toContain('\\begin{document}');
      expect(t.previewSvg).toContain('<svg');
      expect(t.constraints.length).toBeGreaterThan(0);
      expect(t.knobs.length).toBeGreaterThan(0);

      for (const knob of t.knobs) {
        // A knob whose default is not one of its own options would resolve to a
        // directive that does not exist.
        expect(knob.options.map((o) => o.value)).toContain(knob.defaultValue);
        // Every option must carry the sentence the harness is actually given.
        for (const option of knob.options) {
          expect(option.directive.length).toBeGreaterThan(8);
        }
      }
    }
  });

  it('declares placeholders that actually appear in the skeleton', () => {
    // A placeholder string that is not in its own skeleton is dead config: the
    // guard would never fire on it, and the filler it was meant to catch would
    // ship. This is the invariant that keeps the two halves in step when a
    // skeleton is edited.
    for (const t of DEFAULT_RESUME_TEMPLATES) {
      expect(t.placeholders.length).toBeGreaterThan(0);
      for (const filler of t.placeholders) {
        expect(t.skeleton).toContain(filler);
      }
    }
  });

  it('seeds each default exactly once, however many times it is run', async () => {
    await seedResumeTemplates(TemplateModel);
    const first = await TemplateModel.countDocuments();
    expect(first).toBe(DEFAULT_RESUME_TEMPLATES.length);

    await seedResumeTemplates(TemplateModel);
    await seedResumeTemplates(TemplateModel);

    expect(await TemplateModel.countDocuments()).toBe(first);

    for (const t of DEFAULT_RESUME_TEMPLATES) {
      expect(await TemplateModel.countDocuments({ key: t.key })).toBe(1);
    }
  });

  it('stores the shape the service reads back', async () => {
    await seedResumeTemplates(TemplateModel);
    const expected = DEFAULT_RESUME_TEMPLATES[0];
    const stored = await TemplateModel.findOne({ key: expected.key }).lean();

    expect(stored.name).toBe(expected.name);
    expect(stored.skeleton).toBe(expected.skeleton);
    expect(stored.isActive).toBe(true);
    expect(stored.knobs[0].options[0].directive).toBe(
      expected.knobs[0].options[0].directive,
    );
  });

  it('updates a changed template body in place instead of adding a second one', async () => {
    await seedResumeTemplates(TemplateModel);
    const key = DEFAULT_RESUME_TEMPLATES[0].key;

    // Simulate the collection having drifted from the seed — an older body, or
    // an edit made by hand. Re-running must restore the seed as the truth.
    await TemplateModel.updateOne(
      { key },
      { $set: { skeleton: '% stale body', name: 'Stale name' } },
    );

    await seedResumeTemplates(TemplateModel);

    const restored = await TemplateModel.findOne({ key }).lean();
    expect(restored.skeleton).toBe(DEFAULT_RESUME_TEMPLATES[0].skeleton);
    expect(restored.name).toBe(DEFAULT_RESUME_TEMPLATES[0].name);
    expect(await TemplateModel.countDocuments({ key })).toBe(1);
  });

  it('reactivates a template that was switched off, without duplicating it', async () => {
    await seedResumeTemplates(TemplateModel);
    const key = DEFAULT_RESUME_TEMPLATES[1].key;
    await TemplateModel.updateOne({ key }, { $set: { isActive: false } });

    await seedResumeTemplates(TemplateModel);

    const back = await TemplateModel.findOne({ key }).lean();
    expect(back.isActive).toBe(true);
    expect(await TemplateModel.countDocuments({ key })).toBe(1);
  });
});
