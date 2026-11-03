import { isPostedToday, listedInCanada, publicListingFilter, torontoDayRange } from './fresh-canada-listing';

describe('fresh Canada listings', () => {
  const now = new Date('2026-11-03T17:00:00.000Z');

  it('keeps a role posted today in Toronto and drops yesterday or a missing date', () => {
    expect(isPostedToday('2026-11-03T08:15:00-05:00', now)).toBe(true);
    expect(isPostedToday('2026-11-02T22:00:00-05:00', now)).toBe(false);
    expect(isPostedToday('Posted Today', now)).toBe(true);
    expect(isPostedToday(null, now)).toBe(false);
    expect(listedInCanada({ country: 'US', eligibleCountries: ['CA'] }, 'Remote, Canada; Remote, United States')).toBe(true);
    expect(listedInCanada({ country: 'US', eligibleCountries: ['US'] }, 'San Francisco')).toBe(false);
  });

  it('limits the public list to employer jobs plus today Canada market jobs', () => {
    const { start, end } = torontoDayRange(now);
    expect(publicListingFilter(now)).toEqual({
      isActive: true,
      $or: [
        { source: { $nin: ['Greenhouse', 'Lever', 'Workday'] } },
        {
          source: { $in: ['Greenhouse', 'Lever', 'Workday'] },
          country: 'CA',
          postedAt: { $gte: start, $lt: end },
        },
      ],
    });
    expect(start.toISOString()).toBe('2026-11-03T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-04T05:00:00.000Z');
  });
});
