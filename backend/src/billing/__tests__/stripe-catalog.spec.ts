import Stripe from 'stripe';
import { buildLiveStripeTiers } from '../stripe-catalog';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Stripe catalog', () => {
  it('loads the catalog from the production image layout', () => {
    const directory = mkdtempSync(join(tmpdir(), 'jobocate-catalog-'));
    mkdirSync(join(directory, 'config'));
    copyFileSync(join(__dirname, '../../../config/stripe-catalog.yaml'), join(directory, 'config/stripe-catalog.yaml'));
    try {
      jest.isolateModules(() => {
        jest.doMock('../../load-env', () => ({ REPO_ROOT: directory }));
        const { configuredStripeProductIds } = require('../stripe-catalog');
        expect(configuredStripeProductIds('candidate')).toHaveLength(2);
      });
    } finally {
      jest.dontMock('../../load-env');
      rmSync(directory, { recursive: true, force: true });
    }
  });
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
