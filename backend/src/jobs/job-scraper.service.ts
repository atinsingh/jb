import { Injectable } from '@nestjs/common';

@Injectable()
export class JobScraperService {
  // TODO: Convert from Express service
  async scrapeAllSources(keywords: string[], location: string): Promise<any[]> {
    return [];
  }
}

