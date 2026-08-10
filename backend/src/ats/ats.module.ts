import { Module } from '@nestjs/common';
import { AtsParseabilityService } from './ats-parseability.service';
import { AtsMatchService } from './ats-match.service';

/**
 * ATS compatibility checking.
 *
 * Both services are pure computation — no models, no I/O, no persistence. The
 * caller owns storage, which is what keeps the two questions separate: the
 * generic score is stored on the résumé, the JD-relative one never is.
 */
@Module({
  providers: [AtsParseabilityService, AtsMatchService],
  exports: [AtsParseabilityService, AtsMatchService],
})
export class AtsModule {}
