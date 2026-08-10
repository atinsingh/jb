import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AtsAdapterRegistry } from './ats/ats-adapter.registry';

/**
 * Versioned ATS selector map, served to the browser extension.
 *
 * Selector rot is permanent, not a one-off: when Greenhouse or Lever redesign
 * their markup, every hardcoded selector breaks at once. Shipping a new
 * extension build for that means a Chrome Web Store review — days during which
 * autofill is broken for every user.
 *
 * Serving the map instead makes a redesign a config change. The headless
 * adapters read the same knowledge from their own config, so the two runners
 * cannot silently disagree about where a field lives.
 *
 * Public and unauthenticated on purpose: it contains no candidate data, only
 * CSS selectors, and the extension needs it before a user has signed in.
 */
@ApiTags('apply-runner')
@Controller('extension')
export class SelectorsController {
  constructor(private readonly registry: AtsAdapterRegistry) {}

  @Get('selectors')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({ summary: 'Versioned per-ATS selector map for the browser extension' })
  getSelectors() {
    // Bump when a selector set changes so the extension can tell whether its
    // cached copy is stale.
    const version = 1;

    const platforms = this.registry.all().map((adapter) => {
      // Workday is not selector-driven, so it contributes capabilities only.
      const hasSelectors = typeof (adapter as any).selectorMap === 'function';
      return {
        atsType: adapter.atsType,
        capabilities: adapter.capabilities,
        selectors: hasSelectors ? (adapter as any).selectorMap() : null,
      };
    });

    return { version, platforms };
  }
}
