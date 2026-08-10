import { AtsAdapterRegistry } from './ats-adapter.registry';
import { GreenhouseAdapter } from './greenhouse.adapter';
import { LeverAdapter } from './lever.adapter';
import { AshbyAdapter } from './ashby.adapter';
import { WorkdayAdapter } from './workday.adapter';

describe('AtsAdapterRegistry', () => {
  const registry = new AtsAdapterRegistry();

  describe('headless platforms', () => {
    it('returns the GreenhouseAdapter for a greenhouse URL', () => {
      const adapter = registry.resolve('https://boards.greenhouse.io/acme/jobs/1');
      expect(adapter).toBeInstanceOf(GreenhouseAdapter);
      expect(adapter?.atsType).toBe('greenhouse');
    });

    it('returns the LeverAdapter for a lever URL', () => {
      const adapter = registry.resolve('https://jobs.lever.co/acme/1');
      expect(adapter).toBeInstanceOf(LeverAdapter);
      expect(adapter?.atsType).toBe('lever');
    });

    it('returns the AshbyAdapter for an ashby URL', () => {
      const adapter = registry.resolve('https://jobs.ashbyhq.com/acme/abc-123/application');
      expect(adapter).toBeInstanceOf(AshbyAdapter);
      expect(adapter?.atsType).toBe('ashby');
    });

    it('declares all three as fully headless', () => {
      for (const url of [
        'https://boards.greenhouse.io/acme/jobs/1',
        'https://jobs.lever.co/acme/1',
        'https://jobs.ashbyhq.com/acme/abc-123/application',
      ]) {
        const caps = registry.resolve(url)!.capabilities;
        expect(caps.headlessPrepare).toBe(true);
        expect(caps.headlessSubmit).toBe(true);
        expect(caps.requiresAccount).toBe(false);
      }
    });
  });

  describe('workday', () => {
    // Registered on purpose despite not being drivable: it lets the runner say
    // "finish this one yourself" instead of "unsupported ATS".
    it('resolves to the WorkdayAdapter', () => {
      const adapter = registry.resolve('https://acme.myworkdayjobs.com/x/job/1');
      expect(adapter).toBeInstanceOf(WorkdayAdapter);
    });

    it('declares itself unable to prepare or submit headlessly', () => {
      const caps = registry.resolve('https://acme.myworkdayjobs.com/x/job/1')!.capabilities;
      expect(caps.headlessPrepare).toBe(false);
      expect(caps.headlessSubmit).toBe(false);
      expect(caps.requiresAccount).toBe(true);
      expect(caps.multiPage).toBe(true);
    });

    it('throws rather than silently returning an empty result if called anyway', async () => {
      const adapter = registry.resolve('https://acme.myworkdayjobs.com/x/job/1')!;
      await expect(adapter.introspect({ page: {}, applyUrl: 'x' })).rejects.toThrow(/own browser/i);
      await expect(adapter.submit({ page: {}, applyUrl: 'x', materials: {} })).rejects.toThrow();
    });
  });

  it('returns undefined for unknown / empty URLs', () => {
    expect(registry.resolve('https://acme.com/careers/1')).toBeUndefined();
    expect(registry.resolve('')).toBeUndefined();
    expect(registry.resolve(null)).toBeUndefined();
  });

  it('exposes every adapter for diagnostics', () => {
    expect(registry.all().map((a) => a.atsType).sort()).toEqual([
      'ashby',
      'greenhouse',
      'lever',
      'workday',
    ]);
  });
});
