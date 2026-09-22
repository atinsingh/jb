import Stripe from 'stripe';
import { buildLiveStripeTiers } from '../stripe-catalog';

describe('Stripe catalog', () => {
  it('rejects a configured product that has no default price', () => {
    const prices = [
      {
        id: 'price_monthly',
        active: true,
        currency: 'usd',
        unit_amount: 1000,
        recurring: { interval: 'month' },
        product: {
          id: 'prod_VAucq8N2hh10sb',
          active: true,
          default_price: null,
        },
      },
      {
        id: 'price_yearly',
        active: true,
        currency: 'usd',
        unit_amount: 10000,
        recurring: { interval: 'year' },
        product: {
          id: 'prod_VAue1EgKKX8FIz',
          active: true,
          default_price: 'price_yearly',
        },
      },
    ] as unknown as Stripe.Price[];

    expect(buildLiveStripeTiers(prices, 'candidate')).toEqual([]);
  });
});
