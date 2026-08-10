/**
 * Resolves the {@link AtsAdapter} for an apply URL by ATS type.
 *
 * Four platforms are registered, and they are NOT equivalent — each declares
 * what it can actually do via `capabilities`, and the runner routes on that:
 *
 *   greenhouse / lever / ashby  full headless prepare + submit
 *   workday                     consent handoff (per-tenant account, multi-page)
 *   anything else               undefined -> `needs_human`, never a blind submit
 *
 * Registering Workday is deliberate even though it cannot be driven: it lets
 * the runner say "you need to finish this one yourself" instead of the far less
 * useful "unsupported ATS".
 */
import { Injectable } from '@nestjs/common';
import { detectAtsType } from './ats-detect';
import type { AtsAdapter } from './ats-adapter.interface';
import { GreenhouseAdapter } from './greenhouse.adapter';
import { LeverAdapter } from './lever.adapter';
import { AshbyAdapter } from './ashby.adapter';
import { WorkdayAdapter } from './workday.adapter';

@Injectable()
export class AtsAdapterRegistry {
  private readonly adapters: AtsAdapter[] = [
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new AshbyAdapter(),
    new WorkdayAdapter(),
  ];

  /** The adapter for `applyUrl`, or `undefined` when no supported ATS matches. */
  resolve(applyUrl: string | null | undefined): AtsAdapter | undefined {
    if (!applyUrl) return undefined;
    const type = detectAtsType(applyUrl);
    return this.adapters.find((a) => a.atsType === type && a.matches(applyUrl));
  }

  /** Every registered adapter, for the selector-map endpoint and diagnostics. */
  all(): AtsAdapter[] {
    return [...this.adapters];
  }
}
