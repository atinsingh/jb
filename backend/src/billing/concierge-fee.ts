/** Share of each concierge charge kept by Jobocate. The coach receives the rest. */
export const CONCIERGE_PLATFORM_FEE_RATE = 0.2;

export function conciergeCharge(hourlyRate: number, hours: number) {
  const amountCents = hourlyRate * 100 * hours;
  return { amountCents, feeCents: Math.round(amountCents * CONCIERGE_PLATFORM_FEE_RATE), currency: 'cad' as const };
}
