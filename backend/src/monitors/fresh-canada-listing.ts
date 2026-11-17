/** Open-market sources. Employer posts are not in this list and stay on /jobs. */
export const OPEN_MARKET_SOURCES = ['Greenhouse', 'Lever', 'Workday', 'Ashby'] as const;

export const CANADA_TIME_ZONE = 'America/Toronto';

export function calendarDay(value: Date, timeZone = CANADA_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

/** True when the source date falls on today's calendar day in Toronto. */
export function listedInCanada(
  geo: { country?: string | null; eligibleCountries?: string[] } | null,
  location?: string,
): boolean {
  if (geo?.country === 'CA' || (geo?.eligibleCountries || []).includes('CA')) return true;
  return /\b(canada|ontario|quebec|québec|british columbia|alberta|manitoba|saskatchewan|nova scotia|new brunswick|newfoundland|prince edward island|toronto|vancouver|montr[eé]al|ottawa|calgary|edmonton|winnipeg|halifax)\b/i.test(location || '');
}

/** Inclusive of today. shortcut: 30×24h back from today's Toronto midnight, not 30 local midnights across DST — upgrade if a role on the boundary day must follow the calendar. */
export const OPEN_MARKET_RETENTION_DAYS = 30;

function relativeAgeDays(text: string): number | null {
  if (/^posted today$/i.test(text)) return 0;
  if (/^posted yesterday$/i.test(text)) return 1;
  if (/^posted \d+\+ days ago$/i.test(text)) return OPEN_MARKET_RETENTION_DAYS;
  const days = /^posted (\d+) days ago$/i.exec(text);
  return days ? Number(days[1]) : null;
}

export function openMarketPostedSince(now = new Date()): Date {
  const { start } = torontoDayRange(now);
  return new Date(start.getTime() - (OPEN_MARKET_RETENTION_DAYS - 1) * 864e5);
}

/** True when the source date is inside the 30-day browse window. */
export function postedWithinMonth(value: unknown, now = new Date()): boolean {
  if (value == null || value === '') return false;
  if (typeof value === 'string') {
    const age = relativeAgeDays(value.trim());
    if (age != null) return age < OPEN_MARKET_RETENTION_DAYS;
  }
  const posted = new Date(value as string | number);
  if (Number.isNaN(posted.getTime())) return false;
  const { end } = torontoDayRange(now);
  return posted >= openMarketPostedSince(now) && posted < end;
}

/** Stored postedAt. Workday's relative labels count back from now. */
export function marketPostedAt(value: unknown, now = new Date()): Date {
  if (typeof value === 'string') {
    const age = relativeAgeDays(value.trim());
    if (age != null && age < OPEN_MARKET_RETENTION_DAYS) return new Date(now.getTime() - age * 864e5);
  }
  return new Date(value as string | number);
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

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], rand: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const swap = items[i];
    items[i] = items[j];
    items[j] = swap;
  }
}

/**
 * Deal roles across companies so a page is not one employer's block.
 * The seed keeps page 2 stable for the rest of that Toronto day.
 */
export function variedByCompany<T>(rows: T[], companyOf: (row: T) => string, seed = ''): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = (companyOf(row) || '').trim().toLowerCase() || 'unknown';
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const keys = [...groups.keys()];
  const rand = mulberry32(hashSeed(seed));
  shuffleInPlace(keys, rand);
  for (const key of keys) shuffleInPlace(groups.get(key)!, rand);
  const out: T[] = [];
  let pending = rows.length;
  while (pending > 0) {
    for (const key of keys) {
      const list = groups.get(key)!;
      if (!list.length) continue;
      out.push(list.pop()!);
      pending -= 1;
    }
  }
  return out;
}

/** Active employer jobs, plus Canada open-market jobs still inside the 30-day window. */
export function publicListingFilter(now = new Date()): Record<string, unknown> {
  const { end } = torontoDayRange(now);
  return {
    isActive: true,
    $or: [
      { source: { $nin: [...OPEN_MARKET_SOURCES] } },
      {
        source: { $in: [...OPEN_MARKET_SOURCES] },
        country: 'CA',
        postedAt: { $gte: openMarketPostedSince(now), $lt: end },
      },
    ],
  };
}
