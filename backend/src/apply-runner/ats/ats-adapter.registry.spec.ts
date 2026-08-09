import { AtsAdapterRegistry } from './ats-adapter.registry';
import { GreenhouseAdapter } from './greenhouse.adapter';

describe('AtsAdapterRegistry', () => {
  const registry = new AtsAdapterRegistry();

  it('returns the GreenhouseAdapter for a greenhouse URL', () => {
    const adapter = registry.resolve('https://boards.greenhouse.io/acme/jobs/1');
    expect(adapter).toBeInstanceOf(GreenhouseAdapter);
    expect(adapter?.atsType).toBe('greenhouse');
  });

  it('returns undefined for lever (unsupported → needs_human upstream)', () => {
    expect(registry.resolve('https://jobs.lever.co/acme/1')).toBeUndefined();
  });

  it('returns undefined for workday', () => {
    expect(registry.resolve('https://acme.myworkdayjobs.com/x/job/1')).toBeUndefined();
  });

  it('returns undefined for unknown / empty URLs', () => {
    expect(registry.resolve('https://acme.com/careers/1')).toBeUndefined();
    expect(registry.resolve('')).toBeUndefined();
    expect(registry.resolve(null)).toBeUndefined();
  });
});
