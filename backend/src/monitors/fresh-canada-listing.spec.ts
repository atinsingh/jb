import { isPostedToday, listedInCanada, publicListingFilter, torontoDayRange, variedByCompany } from './fresh-canada-listing';

describe('fresh Canada listings', () => {
  const now = new Date('2026-11-03T17:00:00.000Z');

  it('keeps a role posted today in Toronto and drops yesterday or a missing date', () => {
    expect(isPostedToday('2026-11-03T08:15:00-05:00', now)).toBe(true);
    expect(isPostedToday('2026-11-02T22:00:00-05:00', now)).toBe(false);
    expect(isPostedToday('Posted Today', now)).toBe(true);
    expect(isPostedToday(null, now)).toBe(false);
    expect(listedInCanada({ country: 'US', eligibleCountries: ['CA'] }, 'Remote, Canada; Remote, United States')).toBe(true);
    expect(listedInCanada({ country: 'US', eligibleCountries: ['US'] }, 'San Francisco')).toBe(false);
    expect(listedInCanada(null, 'Dieppe New Brunswick')).toBe(true);
    expect(listedInCanada(null, 'Ghent')).toBe(false);
  });

  it('limits the public list to employer jobs plus today Canada market jobs', () => {
    const { start, end } = torontoDayRange(now);
    expect(publicListingFilter(now)).toEqual({
      isActive: true,
      $or: [
        { source: { $nin: ['Greenhouse', 'Lever', 'Workday', 'Ashby'] } },
        {
          source: { $in: ['Greenhouse', 'Lever', 'Workday', 'Ashby'] },
          country: 'CA',
          postedAt: { $gte: start, $lt: end },
        },
      ],
    });
    expect(start.toISOString()).toBe('2026-11-03T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-04T05:00:00.000Z');
  });

  it('mixes companies so one employer does not fill the first screen', () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => ({ id: `td-${i}`, companyName: 'TD' })),
      { id: 'bmo', companyName: 'BMO' },
      { id: 'shop', companyName: 'Shopify' },
    ];
    const ordered = variedByCompany(rows, (row) => row.companyName, '2026-11-05');
    expect(ordered).toHaveLength(10);
    expect(new Set(ordered.map((row) => row.id)).size).toBe(10);
    expect(new Set(ordered.slice(0, 3).map((row) => row.companyName)).size).toBe(3);
    expect(variedByCompany(rows, (row) => row.companyName, '2026-11-05')).toEqual(ordered);
  });
});
