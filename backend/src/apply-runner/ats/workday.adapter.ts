import { Logger } from '@nestjs/common';
import type { AtsType } from './ats-detect';
import { detectAtsType } from './ats-detect';
import type {
  AtsAdapter,
  AtsCapabilities,
  PrepareContext,
  SubmitContext,
  SubmitResult,
} from './ats-adapter.interface';
import type { FillReport, FormSchema } from '../../answers/form-schema.types';

/**
 * Workday — consent handoff, deliberately not headless.
 *
 * Workday is a different class of problem from Greenhouse, Lever and Ashby.
 * Every employer runs their own tenant, each requires the candidate to REGISTER
 * AN ACCOUNT with a password before they can apply, and the application is a
 * five-to-eight page stateful wizard.
 *
 * Automating that would mean storing candidate credentials per employer tenant
 * and replaying them — a security liability well beyond the rest of this
 * feature, and one no amount of care in this file would make acceptable. So
 * this adapter exists to say so explicitly rather than to try.
 *
 * What it buys us over having no adapter at all: the runner can tell the
 * candidate "Workday needs you to finish this one" instead of the much less
 * useful "unsupported ATS", and the routing is a declared capability rather
 * than an accident of which adapters happen to be registered.
 *
 * NOT YET BUILT: the copy-ready answer panel the design calls for, which would
 * show the candidate their stored answers alongside the handoff so they can
 * paste rather than retype. Until that lands, the handoff is honest but bare.
 */
export class WorkdayAdapter implements AtsAdapter {
  readonly atsType: AtsType = 'workday';

  readonly capabilities: AtsCapabilities = {
    headlessPrepare: false,
    headlessSubmit: false,
    requiresAccount: true,
    multiPage: true,
  };

  private readonly logger = new Logger(WorkdayAdapter.name);

  matches(applyUrl: string): boolean {
    return detectAtsType(applyUrl) === 'workday';
  }

  private refuse(action: string): never {
    this.logger.debug(`Refusing to ${action} a Workday application — consent handoff only.`);
    throw new Error(
      'Workday applications are completed by the candidate in their own browser. ' +
        'Check `capabilities.headlessPrepare` before calling this adapter.',
    );
  }

  // The runner checks `capabilities` before calling any of these. They throw
  // rather than returning empty results so a future caller that forgets the
  // check fails loudly instead of silently recording an empty application.

  async introspect(_ctx: PrepareContext): Promise<FormSchema> {
    return this.refuse('introspect');
  }

  async fill(_ctx: PrepareContext, _answers: Record<string, any>, _materials: any): Promise<FillReport> {
    return this.refuse('fill');
  }

  async submit(_ctx: SubmitContext): Promise<SubmitResult> {
    return this.refuse('submit');
  }
}
