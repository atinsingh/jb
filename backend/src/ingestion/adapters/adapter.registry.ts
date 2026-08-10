import { Injectable } from '@nestjs/common';
import { SourceAdapter } from './adapter.interface';
import { JsonFeedAdapter } from './json-feed.adapter';
import { XmlFeedAdapter } from './xml-feed.adapter';
import { JsonLdJobPostingAdapter } from './jsonld-jobposting.adapter';
import { HtmlCareerPageAdapter } from './html-careerpage.adapter';
import { CsvImportAdapter } from './csv-import.adapter';
import { GreenhouseAdapter } from './greenhouse.adapter';

/**
 * Resolves an AdapterType (from IngestionSource.adapterType) to its adapter
 * implementation. This is the single extension point: to add a new source type,
 * implement SourceAdapter and register it here — the pipeline never changes.
 */
@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<string, SourceAdapter>();

  constructor(
    jsonFeed: JsonFeedAdapter,
    xmlFeed: XmlFeedAdapter,
    jsonld: JsonLdJobPostingAdapter,
    html: HtmlCareerPageAdapter,
    csv: CsvImportAdapter,
    greenhouse: GreenhouseAdapter,
  ) {
    for (const adapter of [jsonFeed, xmlFeed, jsonld, html, csv, greenhouse]) {
      this.adapters.set(adapter.type, adapter);
    }
  }

  get(adapterType: string): SourceAdapter {
    const adapter = this.adapters.get(adapterType);
    if (!adapter) {
      throw new Error(`No adapter registered for type "${adapterType}"`);
    }
    return adapter;
  }

  has(adapterType: string): boolean {
    return this.adapters.has(adapterType);
  }

  listTypes(): string[] {
    return [...this.adapters.keys()];
  }
}
