/** Open-market sources. Employer posts are not in this list and stay on /jobs. */
export const OPEN_MARKET_SOURCES = ['Greenhouse', 'Lever', 'Workday'] as const;

export const CANADA_TIME_ZONE = 'America/Toronto';

// shortcut: five roles per company per day, raise when the Canada market needs more
export const MAX_OPEN_MARKET_PER_COMPANY = 5;

export function calendarDay(value: Date, timeZone = CANADA_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

/** True when the source date falls on today's calendar day in Toronto. */
export function isPostedToday(value: unknown, now = new Date()): boolean {
  if (value == null || value === '') return false;
  if (typeof value === 'string' && /^posted today$/i.test(value.trim())) return true;
  const posted = new Date(value as string | number);
  if (Number.isNaN(posted.getTime())) return false;
  return calendarDay(posted) === calendarDay(now);
}

export function torontoDayRange(now = new Date()): { start: Date; end: Date } {
  const day = calendarDay(now);
  const utcMidnight = new Date(`${day}T00:00:00.000Z`);
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: CANADA_TIME_ZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(utcMidnight).find((part) => part.type === 'timeZoneName')?.value || '';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(zone);
  const offset = match
    ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) * 60 * 1000
    : 0;
  const start = new Date(utcMidnight.getTime() - offset);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Active employer jobs, plus open-market jobs posted today in Canada. */
export function publicListingFilter(now = new Date()): Record<string, unknown> {
  const { start, end } = torontoDayRange(now);
  return {
    isActive: true,
    $or: [
      { source: { $nin: [...OPEN_MARKET_SOURCES] } },
      {
        source: { $in: [...OPEN_MARKET_SOURCES] },
        country: 'CA',
        postedAt: { $gte: start, $lt: end },
      },
    ],
  };
}
