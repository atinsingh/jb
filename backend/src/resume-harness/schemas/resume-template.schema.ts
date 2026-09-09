import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ResumeTemplateDocument = HydratedDocument<ResumeTemplate>;

/**
 * One value a knob can take, and the sentence the harness is given for it.
 *
 * The directive lives here rather than in the service because it is the whole
 * content of the choice: "compact" means nothing to a model, and a mapping from
 * value to instruction kept in code would make adding a look option a deploy.
 */
@Schema({ _id: false })
export class ResumeTemplateKnobOption {
  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  label: string;

  /** Written verbatim into AGENTS.md when this option is selected. */
  @Prop({ required: true })
  directive: string;
}

const ResumeTemplateKnobOptionSchema = SchemaFactory.createForClass(
  ResumeTemplateKnobOption,
);

/**
 * One dial of the vibe-change, declared per template.
 *
 * Knobs are per template on purpose: an accent colour is meaningful on a
 * template whose headings are coloured and meaningless on a strictly
 * black-and-white one, and offering it there would be a control that does
 * nothing.
 */
@Schema({ _id: false })
export class ResumeTemplateKnob {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  label: string;

  /** Must be one of `options[].value`; the seed test asserts it. */
  @Prop({ required: true })
  defaultValue: string;

  @Prop({ type: [ResumeTemplateKnobOptionSchema], default: [] })
  options: ResumeTemplateKnobOption[];
}

const ResumeTemplateKnobSchema =
  SchemaFactory.createForClass(ResumeTemplateKnob);

/**
 * A predefined LaTeX résumé template.
 *
 * Templates are data, never code: the whole document — skeleton, constraints
 * and the look options it supports — is seeded by
 * `npm run harness:seed-templates`, so adding one is a seed change and never a
 * harness change. Nothing in `resume-harness/` branches on a template key.
 *
 * The skeleton is written into the sandbox as `TEMPLATE.tex` rather than being
 * inlined into the shared rules. Keeping it a real file means the harness can
 * read the preamble it has to preserve instead of reconstructing it from a
 * prose description, and it keeps AGENTS.md readable.
 */
@Schema({ timestamps: true, collection: 'resume_templates' })
export class ResumeTemplate {
  /** Stable identifier. The seed upserts on this, and sessions store it. */
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  /**
   * Inline SVG shown in the picker.
   *
   * Deliberately not a compiled PDF: JOB-98 does not persist compiled output,
   * so a PDF preview would either be missing or would need a build per page
   * load. A drawn approximation of the layout is what the candidate is choosing
   * between anyway.
   */
  @Prop({ required: true })
  previewSvg: string;

  /** LaTeX preamble and section scaffolding, written as `TEMPLATE.tex`. */
  @Prop({ required: true })
  skeleton: string;

  /** Rules the harness must not break for this template. */
  @Prop({ type: [String], default: [] })
  constraints: string[];

  /**
   * The filler strings in `skeleton` that a finished résumé must not contain.
   *
   * Declared as data rather than inferred, because a skeleton line is either
   * scaffolding to keep (`\ressection{Summary}`) or filler to replace ("Two or
   * three lines, written from CANDIDATE.md.") and only the template's author
   * knows which. `ResumeContentGuard` uses this to tell a real résumé from a
   * compiled template — a distinction `latexmk` cannot make, because filler
   * compiles just as cleanly as a career.
   */
  @Prop({ type: [String], default: [] })
  placeholders: string[];

  @Prop({ type: [ResumeTemplateKnobSchema], default: [] })
  knobs: ResumeTemplateKnob[];

  /** Display order, and the tie-break for "which template when none is named". */
  @Prop({ default: 100 })
  rank: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const ResumeTemplateSchema =
  SchemaFactory.createForClass(ResumeTemplate);

ResumeTemplateSchema.index({ isActive: 1, rank: 1 });
