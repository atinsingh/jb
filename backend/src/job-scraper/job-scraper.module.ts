import { Module } from '@nestjs/common';
import { JobScraperService } from './job-scraper.service';

@Module({
  providers: [JobScraperService],
  exports: [JobScraperService],
})
export class JobScraperModule {}

