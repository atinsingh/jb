import Stripe from 'stripe';
import { buildLiveStripeTiers, configuredStripeProductIds, fetchConfiguredStripePrices } from '../stripe-catalog';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Stripe catalog', () => {
  const keys = ['STRIPE_CANDIDATE_PAID_MONTHLY_PRODUCT_ID', 'STRIPE_CANDIDATE_PAID_YEARLY_PRODUCT_ID', 'STRIPE_EMPLOYER_PAID_MONTHLY_PRODUCT_ID', 'STRIPE_EMPLOYER_PAID_YEARLY_PRODUCT_ID'];
  let saved: Array<string | undefined>;
  beforeEach(() => {
    saved = keys.map(key => process.env[key]);
    keys.forEach((key, index) => { process.env[key] = ['prod_VAucq8N2hh10sb', 'prod_VAue1EgKKX8FIz'][index % 2]; });
  });
  afterEach(() => keys.forEach((key, index) => {
    if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index];
  }));
  it('uses only environment products for both audiences and fails without a configured ID', async () => {
    for (const mode of ['Dev', 'Production']) {
      keys.forEach((key, index) => { process.env[key] = `prod_${mode}${index}`; });
      expect(configuredStripeProductIds('candidate')).toEqual([`prod_${mode}0`, `prod_${mode}1`]);
      expect(configuredStripeProductIds('employer')).toEqual(configuredStripeProductIds('candidate'));
      const prices = { list: jest.fn().mockResolvedValue({ data: [] }) };
      await fetchConfiguredStripePrices({ prices } as unknown as Stripe, 'candidate');
      expect(prices.list).toHaveBeenNthCalledWith(1, expect.objectContaining({ product: `prod_${mode}0` }));
      expect(prices.list).toHaveBeenNthCalledWith(2, expect.objectContaining({ product: `prod_${mode}1` }));
    }
    delete process.env[keys[0]];
    expect(() => configuredStripeProductIds('candidate')).toThrow(keys[0]);
    process.env[keys[0]] = 'price_wrong';
    expect(() => configuredStripeProductIds('candidate')).toThrow(keys[0]);
  });
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
