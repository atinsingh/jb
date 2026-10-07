import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import Stripe from 'stripe';
import { parse } from 'yaml';
import { z } from 'zod';
import { REPO_ROOT } from '../load-env';

export type StripeCatalogAudience = 'candidate' | 'employer';

export interface LiveStripeTier {
  key: string;
  name: string;
  currency: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  stripeProductIdMonthly: string;
  stripeProductIdYearly: string;
}

const productRefSchema = z.object({
  env: z
    .string()
    .regex(/^STRIPE_[A-Z0-9_]+$/),
});

const tierSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  products: z.object({ monthly: productRefSchema, yearly: productRefSchema }),
});

const catalogSchema = z.object({
  version: z.literal(1),
  audiences: z.object({
    candidate: z.array(tierSchema),
    employer: z.array(tierSchema),
  }),
});

type CatalogTier = z.infer<typeof tierSchema>;
let cachedCatalog: z.infer<typeof catalogSchema> | undefined;

const catalog = () => {
  if (!cachedCatalog) {
    const backendRoot = existsSync(join(REPO_ROOT, 'backend', 'config'))
      ? join(REPO_ROOT, 'backend')
      : REPO_ROOT;
    const path = join(backendRoot, 'config', 'stripe-catalog.yaml');
    cachedCatalog = catalogSchema.parse(parse(readFileSync(path, 'utf8')));
  }
  return cachedCatalog;
};

const configuredProductId = (ref: CatalogTier['products']['monthly']): string => {
  const id = process.env[ref.env]?.trim();
  if (!id || !/^prod_[A-Za-z0-9]+$/.test(id)) {
    throw new Error(`Configure ${ref.env} with a valid Stripe product ID in the environment file for this deployment.`);
  }
  return id;
};

export const configuredStripeProductIds = (
  audience: StripeCatalogAudience,
): string[] =>
  catalog().audiences[audience].flatMap((tier) => [
    configuredProductId(tier.products.monthly),
    configuredProductId(tier.products.yearly),
  ]);

/**
 * Query Stripe once per allowlisted product rather than scanning the account.
 * This remains correct when the shared account has more than 100 active prices
 * and avoids loading products owned by other applications in the first place.
 */
export const fetchConfiguredStripePrices = async (
  stripe: Stripe,
  audience: StripeCatalogAudience,
): Promise<Stripe.Price[]> => {
  const pages = await Promise.all(
    configuredStripeProductIds(audience).map((product) =>
      stripe.prices.list({
        product,
        active: true,
        type: 'recurring',
        limit: 100,
        expand: ['data.product'],
      }),
    ),
  );

  return Array.from(
    new Map(pages.flatMap((page) => page.data).map((price) => [price.id, price])).values(),
  );
};

const livePrice = (prices: Stripe.Price[], productId: string, interval: 'month' | 'year'): { price: Stripe.Price; product: Stripe.Product } | null => {
  const matches = prices.filter((price) => {
    if (!price.active || price.unit_amount == null || price.recurring?.interval !== interval) return false;
    if (typeof price.product === 'string' || !price.product || 'deleted' in price.product) return false;
    const product = price.product as Stripe.Product;
    if (!product.active || product.id !== productId) return false;
    const defaultPriceId = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
    return Boolean(defaultPriceId) && price.id === defaultPriceId;
  });
  if (matches.length !== 1) return null;
  return { price: matches[0], product: matches[0].product as Stripe.Product };
};

/**
 * Build tiers only from explicitly configured products. Stripe remains the
 * source of truth for active default Price IDs, amounts, currency and interval;
 * the YAML file names the environment variables that isolate this app's products.
 */
export const buildLiveStripeTiers = (prices: Stripe.Price[], audience: StripeCatalogAudience): LiveStripeTier[] =>
  catalog().audiences[audience].flatMap((tier) => {
    const monthlyProductId = configuredProductId(tier.products.monthly);
    const yearlyProductId = configuredProductId(tier.products.yearly);
    const monthly = livePrice(prices, monthlyProductId, 'month');
    const yearly = livePrice(prices, yearlyProductId, 'year');
    if (!monthly || !yearly) return [];
    if (monthly.price.currency !== yearly.price.currency) {
      throw new Error(`Stripe tier ${tier.name} mixes currencies`);
    }

    return [
      {
        key: tier.key,
        name: tier.name,
        currency: monthly.price.currency,
        priceMonthly: monthly.price.unit_amount! / 100,
        priceYearly: yearly.price.unit_amount! / 100,
        stripePriceIdMonthly: monthly.price.id,
        stripePriceIdYearly: yearly.price.id,
        stripeProductIdMonthly: monthly.product.id,
        stripeProductIdYearly: yearly.product.id,
      },
    ];
  });
