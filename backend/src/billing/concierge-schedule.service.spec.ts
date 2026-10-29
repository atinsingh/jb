import { conciergeCharge, conciergeDurationsReady } from './concierge-fee';

describe('Concierge durations', () => {
  beforeEach(() => { process.env.CONCIERGE_PLATFORM_FEE_PERCENT = '20'; });

  it('accepts a Calendly or Google link on each 15-minute length', () => {
    expect(conciergeDurationsReady({ durations: [{ minutes: 30, url: 'https://calendly.com/coach/30' }, { minutes: 90, url: 'https://calendar.app.google/abc' }] })).toBe(true);
    expect(conciergeDurationsReady({ durations: [{ minutes: 30, url: 'https://zoom.us/j/1' }] })).toBe(false);
    expect(conciergeDurationsReady({ durations: [{ minutes: 20, url: 'https://meet.google.com/abc' }] })).toBe(false);
    expect(conciergeDurationsReady({ durations: [{ minutes: 30, url: 'https://calendly.com/a' }, { minutes: 30, url: 'https://meet.google.com/b' }] })).toBe(false);
    expect(conciergeDurationsReady({ durations: [{ minutes: 30, url: 'https://calendly.com/intro?q=" onclick="alert(1)' }] })).toBe(false);
    expect(conciergeDurationsReady({ durations: [] })).toBe(false);
  });

  it('prices a duration from the hourly rate', () => {
    expect(conciergeCharge(100, 15).amountCents).toBe(2500);
    expect(conciergeCharge(100, 90)).toMatchObject({ amountCents: 15000, feeCents: 3000 });
  });
});
