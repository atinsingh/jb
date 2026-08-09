import { resolveTargetCountries, isTargetedCountry } from './target-countries.util';

describe('resolveTargetCountries', () => {
  it('uses the profile targets when set', () => {
    expect(resolveTargetCountries({ targetCountries: ['CA', 'US'] }, { country: 'IN' })).toEqual(['CA', 'US']);
  });

  // AC1.4 — profiles predating this field must behave exactly as before.
  it('falls back to the current country when the profile states no target', () => {
    expect(resolveTargetCountries({ targetCountries: [] }, { country: 'IN' })).toEqual(['IN']);
    expect(resolveTargetCountries(null, { country: 'IN' })).toEqual(['IN']);
    expect(resolveTargetCountries(undefined, { country: 'in' })).toEqual(['IN']);
  });

  it('returns empty when neither source yields a usable code', () => {
    expect(resolveTargetCountries(null, null)).toEqual([]);
    expect(resolveTargetCountries({ targetCountries: [] }, { country: '' })).toEqual([]);
  });

  it('normalizes case and whitespace, and drops non-ISO2 values', () => {
    expect(resolveTargetCountries({ targetCountries: [' ca ', 'Us', 'Canada', '', 'X'] }, null)).toEqual(['CA', 'US']);
  });

  it('de-duplicates', () => {
    expect(resolveTargetCountries({ targetCountries: ['CA', 'ca', ' CA'] }, null)).toEqual(['CA']);
  });

  it('does not fall back when the profile has any valid target', () => {
    expect(resolveTargetCountries({ targetCountries: ['CA'] }, { country: 'IN' })).toEqual(['CA']);
  });
});

describe('isTargetedCountry', () => {
  it('matches a targeted country', () => {
    expect(isTargetedCountry('CA', ['CA', 'US'])).toBe(true);
    expect(isTargetedCountry('ca', ['CA'])).toBe(true);
  });

  it('rejects a non-targeted country', () => {
    expect(isTargetedCountry('IN', ['CA'])).toBe(false);
  });

  it('treats an empty target list as unfiltered', () => {
    expect(isTargetedCountry('IN', [])).toBe(true);
  });

  it('does not exclude on an undeterminable country', () => {
    expect(isTargetedCountry(null, ['CA'])).toBe(true);
    expect(isTargetedCountry('', ['CA'])).toBe(true);
    expect(isTargetedCountry('Canada', ['CA'])).toBe(true);
  });
});
