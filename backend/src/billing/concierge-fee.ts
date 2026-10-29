/** Percent of each concierge charge kept by Jobocate. Set CONCIERGE_PLATFORM_FEE_PERCENT in .env.local. */
const DEFAULT_FEE_PERCENT = 20;

export function conciergePlatformFeeRate(): number {
  const raw = process.env.CONCIERGE_PLATFORM_FEE_PERCENT;
  const percent = raw == null || raw.trim() === '' ? DEFAULT_FEE_PERCENT : Number(raw);
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) {
    throw new Error('CONCIERGE_PLATFORM_FEE_PERCENT must be a number from 0 to 99');
  }
  return percent / 100;
}

// shortcut: 8 hours is the longest single session, raise this when a longer booking is sold.
export const CONCIERGE_DURATION_MAX = 480;

const DURATION_HOSTS = new Set(['calendly.com', 'meet.google.com', 'calendar.google.com', 'calendar.app.google']);

export function conciergeDurationAllowed(minutes: number) {
  return Number.isInteger(minutes) && minutes >= 15 && minutes <= CONCIERGE_DURATION_MAX && minutes % 15 === 0;
}

export function conciergeDurationLink(url?: string) {
  const raw = (url || '').trim();
  if (/["'<>\u0000-\u001F\u007F]/.test(raw)) return false;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    return DURATION_HOSTS.has(parsed.hostname.toLowerCase().replace(/^www\./, ''));
  } catch {
    return false;
  }
}

export function conciergeDurationsReady(profile?: { durations?: { minutes?: number; url?: string }[] }) {
  const rows = profile?.durations || [];
  if (!rows.length) return false;
  const seen = new Set<number>();
  return rows.every((row) => {
    const minutes = Number(row.minutes);
    if (!conciergeDurationAllowed(minutes) || !conciergeDurationLink(row.url) || seen.has(minutes)) return false;
    seen.add(minutes);
    return true;
  });
}

export function conciergeDurationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
  return rest ? `${hourLabel} ${rest} min` : hourLabel;
}

export function conciergeCharge(hourlyRate: number, minutes: number) {
  const blocks = minutes / 15;
  if (!Number.isInteger(hourlyRate) || !Number.isInteger(blocks) || blocks < 1) {
    throw new Error('Concierge duration must be a 15-minute step of an hourly rate');
  }
  const amountCents = hourlyRate * 25 * blocks;
  return { amountCents, feeCents: Math.round(amountCents * conciergePlatformFeeRate()), currency: 'cad' as const };
}
