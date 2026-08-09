/**
 * Resolves the {@link AtsAdapter} for an apply URL by ATS type.
 *
 * Only Greenhouse is registered for now — every other ATS (lever / workday /
 * unknown) intentionally resolves to `undefined`, which the runner turns into a
 * `needs_human` outcome rather than attempting a blind submit.
 */
import { Injectable } from '@nestjs/common';
import { detectAtsType } from './ats-detect';
import type { AtsAdapter } from './ats-adapter.interface';
import { GreenhouseAdapter } from './greenhouse.adapter';

@Injectable()
export class AtsAdapterRegistry {
  private readonly adapters: AtsAdapter[] = [new GreenhouseAdapter()];

  /** The adapter for `applyUrl`, or `undefined` when no supported ATS matches. */
  resolve(applyUrl: string | null | undefined): AtsAdapter | undefined {
    if (!applyUrl) return undefined;
    const type = detectAtsType(applyUrl);
    return this.adapters.find((a) => a.atsType === type && a.matches(applyUrl));
  }
}
