import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ResumeTemplate,
  ResumeTemplateDocument,
  ResumeTemplateKnob,
} from './schemas/resume-template.schema';
import { TemplateCondition } from './context-files.service';

/** The knob choices in force for a session, as `knobKey -> optionValue`. */
export type VibeState = Record<string, string>;

/** A template as the picker needs it — everything except the sandbox file. */
export interface TemplateView {
  key: string;
  name: string;
  description: string;
  previewSvg: string;
  constraints: string[];
  knobs: {
    key: string;
    label: string;
    defaultValue: string;
    options: { value: string; label: string }[];
  }[];
}

export interface ResolvedLook {
  /**
   * Absent only when the catalogue is empty and the caller named no template.
   * Generation still runs in that state — see `resolve`.
   */
  template?: ResumeTemplate;
  vibe: VibeState;
}

/**
 * Reads the seeded template catalogue and turns a requested look into a
 * validated one.
 *
 * Two invariants live here rather than being trusted to callers:
 *
 * 1. **A knob value the template did not declare never reaches the harness.**
 *    An unknown key or value is a 400, not a directive the model has to guess
 *    at. Silently dropping it would be worse: the candidate would see a control
 *    move and the résumé not change.
 *
 * 2. **Carrying a look forward is lossy on purpose.** When the template changes
 *    — mid-session or into a new session on another harness — knobs the new
 *    template does not declare are dropped rather than carried as dead state.
 *    An accent on a template with no colour is a setting that cannot be honoured.
 */
@Injectable()
export class ResumeTemplateService {
  constructor(
    @InjectModel(ResumeTemplate.name)
    private readonly templateModel: Model<ResumeTemplateDocument>,
  ) {}

  /** Active templates in display order, without the LaTeX skeleton. */
  async list(): Promise<TemplateView[]> {
    const docs = await this.templateModel
      .find({ isActive: true })
      .sort({ rank: 1, key: 1 })
      .lean()
      .exec();

    return docs.map((doc: any) => ({
      key: doc.key,
      name: doc.name,
      description: doc.description,
      previewSvg: doc.previewSvg,
      constraints: doc.constraints || [],
      knobs: (doc.knobs || []).map((knob: ResumeTemplateKnob) => ({
        key: knob.key,
        label: knob.label,
        defaultValue: knob.defaultValue,
        options: (knob.options || []).map((o) => ({
          value: o.value,
          label: o.label,
        })),
      })),
    }));
  }

  /**
   * Settles which template and which knob values a session runs under.
   *
   * `base` is the look already in force — the session's current one for a vibe
   * change, or the carried-forward session's for a new session. Values in it are
   * applied where the resolved template still declares the knob and ignored
   * where it does not, so switching template is never blocked by a setting the
   * new template has never heard of.
   *
   * `requested` is what the caller explicitly asked for, and is validated
   * strictly: this is the input a person just moved a control to produce.
   *
   * An empty catalogue is not an error when nobody asked for a template. A
   * database that has not been seeded yet would otherwise take résumé
   * generation down entirely, and typography is not what the feature is for —
   * so the session runs without a template condition and the shared rules omit
   * that section. Naming a template that does not exist is still a 404: that
   * request cannot be honoured, and pretending otherwise would show the
   * candidate a template they did not get.
   */
  async resolve(
    templateKey: string | undefined,
    requested: VibeState | undefined,
    base?: { templateKey?: string; vibe?: VibeState },
  ): Promise<ResolvedLook> {
    const key = templateKey || base?.templateKey;
    const template = key
      ? await this.mustGet(key)
      : await this.defaultTemplate();

    if (!template) return { vibe: {} };

    const knobs = template.knobs || [];
    const byKey = new Map(knobs.map((k) => [k.key, k]));

    // Start from the template's own defaults so every declared knob has a value
    // and no directive is ever missing from the rules.
    const vibe: VibeState = {};
    for (const knob of knobs) vibe[knob.key] = knob.defaultValue;

    // The look already in force, where this template can still honour it.
    for (const [k, v] of Object.entries(base?.vibe || {})) {
      const knob = byKey.get(k);
      if (knob && knob.options.some((o) => o.value === v)) vibe[k] = v;
    }

    // What the caller just asked for, strictly.
    for (const [k, v] of Object.entries(requested || {})) {
      const knob = byKey.get(k);
      if (!knob) {
        throw new BadRequestException(
          `"${k}" is not a look option on the ${template.name} template.`,
        );
      }
      if (!knob.options.some((o) => o.value === v)) {
        throw new BadRequestException(
          `"${v}" is not a ${knob.label.toLowerCase()} option on the ${template.name} template.`,
        );
      }
      vibe[k] = v;
    }

    return { template, vibe };
  }

  /**
   * The template condition as the context files need it.
   *
   * Every string in the result comes from the template document. Nothing here
   * decides what "compact" means — that sentence was seeded.
   */
  condition(template: ResumeTemplate, vibe: VibeState): TemplateCondition {
    return {
      key: template.key,
      name: template.name,
      description: template.description,
      skeleton: template.skeleton,
      constraints: template.constraints || [],
      look: (template.knobs || []).map((knob) => {
        const choice = vibe[knob.key] ?? knob.defaultValue;
        const option =
          knob.options.find((o) => o.value === choice) || knob.options[0];
        return {
          key: knob.key,
          label: knob.label,
          choice: option?.value ?? choice,
          choiceLabel: option?.label ?? choice,
          directive: option?.directive ?? '',
        };
      }),
    };
  }

  private async mustGet(key: string): Promise<ResumeTemplate> {
    const doc = await this.templateModel
      .findOne({ key, isActive: true })
      .lean()
      .exec();
    if (!doc) {
      throw new NotFoundException(
        `Résumé template "${key}" does not exist. Run "npm run harness:seed-templates" if the catalogue is empty.`,
      );
    }
    return doc as unknown as ResumeTemplate;
  }

  /**
   * The template a session gets when nobody chose one.
   *
   * Lowest rank wins, which is the same ordering the picker shows — so the
   * default is always the first card rather than an invisible preference.
   * Undefined means the catalogue is empty, which the caller treats as
   * "no template" rather than as a failure.
   */
  private async defaultTemplate(): Promise<ResumeTemplate | undefined> {
    const docs = await this.templateModel
      .find({ isActive: true })
      .sort({ rank: 1, key: 1 })
      .lean()
      .exec();
    return docs.length ? (docs[0] as unknown as ResumeTemplate) : undefined;
  }
}
