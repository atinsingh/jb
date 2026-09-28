import { ConflictException } from '@nestjs/common';
import Stripe from 'stripe';

const BLOCKING_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']);

/** Check Stripe, not the eventually consistent local webhook projection. */
export async function currentPaidSubscription(stripe: Stripe, customer: string): Promise<Stripe.Subscription | null> {
  let startingAfter: string | undefined;
  do {
    const page = await stripe.subscriptions.list({ customer, status: 'all', limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    const blocking = page.data.find((subscription) => BLOCKING_STATUSES.has(subscription.status));
    if (blocking) return blocking;
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return null;
}

export async function existingPaidSubscription(stripe: Stripe, customer: string): Promise<boolean> {
  return Boolean(await currentPaidSubscription(stripe, customer));
}

export async function reusableCheckout(
  stripe: Stripe,
  customer: string,
  belongsToAccount: (session: Stripe.Checkout.Session) => boolean,
  matchesRequest: (session: Stripe.Checkout.Session) => boolean,
): Promise<Stripe.Checkout.Session | null> {
  let startingAfter: string | undefined;
  do {
    const page = await stripe.checkout.sessions.list({ customer, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    const pending = page.data.find((session) => session.mode === 'subscription' && session.status === 'open' && belongsToAccount(session));
    if (pending) {
      if (!matchesRequest(pending) || !pending.url) {
        throw new ConflictException('A different checkout is already in progress. Complete it or wait for it to expire before choosing another plan.');
      }
      return pending;
    }
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return null;
}

export function rejectExistingSubscription(): never {
  throw new ConflictException('This account already has a subscription. Manage or cancel it in billing before purchasing again.');
}
