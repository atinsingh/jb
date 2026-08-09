import { Module } from '@nestjs/common';
import { JobGeoService } from './job-geo.service';
import { EligibilityService } from './eligibility.service';

/**
 * Centralized geography + eligibility engine (Stage 1). Deterministic,
 * explainable, and reusable by ingestion, monitors, and matching. Keeping it
 * in one module prevents country logic from scattering across the codebase.
 */
@Module({
  providers: [JobGeoService, EligibilityService],
  exports: [JobGeoService, EligibilityService],
})
export class GeographyModule {}
