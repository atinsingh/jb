/**
 * Create/refresh the Jobocate product + price catalog in Stripe, then point the
 * app at it.
 *
 * Prices are addressed by **lookup key**, never by a hardcoded `price_...`: a
 * lookup key is a stable account-unique alias, so the same code runs against the
 * test and live accounts and this script is safe to re-run (an existing key is
 * reported and left alone — Stripe prices are immutable by design).
 *
 *   Candidate plans → SubscriptionPlan docs get stripePriceIdMonthly/Yearly.
 *   Employer plans  → resolved at runtime from the lookup key, nothing to store.
 *
 * USAGE
 *   npm run stripe:sync              # dry run — reports what it would create
 *   npm run stripe:sync -- --apply   # create the missing objects
 *
 * Existing unrelated products in the account are never touched.
 */
import mongoose from 'mongoose';
import Stripe from 'stripe';
import '../load-env';
import {
  EMPLOYER_PLANS,
  employerPriceLookupKey,
} from '../employer-billing/employer-plans';
import { SubscriptionPlanSchema } from '../schemas/subscription-plan.schema';

const APPLY = process.argv.includes('--apply');

interface DesiredPrice {
  lookupKey: string;
  /** Amount in cents for the whole billing period. */
  amount: number;
  interval: 'month' | 'year';
  nickname: string;
}

interface DesiredProduct {
  /** Stable key stored in product metadata so re-runs find the same product. */
  key: string;
  name: string;
  audience: 'candidate' | 'employer';
  planRef: string;
  prices: DesiredPrice[];
}

async function buildDesiredCatalog(): Promise<DesiredProduct[]> {
  const desired: DesiredProduct[] = [];

  // ---- Candidate plans come from the seeded SubscriptionPlan docs, so the
  // Stripe amounts can never silently disagree with what /pricing renders.
  const PlanModel = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
  const plans = await PlanModel.find({ isActive: true }).lean();

  for (const plan of plans as any[]) {
    if (!plan.priceMonthly) continue; // FREE needs no Stripe object
    const key = String(plan.type).toLowerCase();
    desired.push({
      key: `jobocate_${key}`,
      name: `Jobocate ${plan.name}`,
      audience: 'candidate',
      planRef: String(plan._id),
      prices: [
        {
          lookupKey: `jobocate_${key}_monthly`,
          amount: Math.round(plan.priceMonthly * 100),
          interval: 'month',
          nickname: `${plan.name} monthly`,
        },
        {
          lookupKey: `jobocate_${key}_yearly`,
          amount: Math.round(plan.priceYearly * 100),
          interval: 'year',
          nickname: `${plan.name} yearly`,
        },
      ],
    });
  }

  // ---- Employer plans: `annual` is the marketed per-month price when billed
  // yearly, so the yearly Stripe amount is that × 12.
  for (const plan of EMPLOYER_PLANS.filter((p) => p.selfServe)) {
    desired.push({
      key: `jobocate_employer_${plan.key}`,
      name: `Jobocate for Employers — ${plan.name}`,
      audience: 'employer',
      planRef: plan.key,
      prices: [
        {
          lookupKey: employerPriceLookupKey(plan.key, 'monthly'),
          amount: plan.monthly * 100,
          interval: 'month',
          nickname: `Employer ${plan.name} monthly`,
        },
        {
          lookupKey: employerPriceLookupKey(plan.key, 'annual'),
          amount: plan.annual * 12 * 100,
          interval: 'year',
          nickname: `Employer ${plan.name} annual`,
        },
      ],
    });
  }

  return desired;
}

async function main(): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');
  const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });

  const account = await stripe.accounts.retrieve();
  const live = secretKey.startsWith('sk_live_');
  console.log(
    `${APPLY ? '🔧 APPLYING' : '🔍 DRY RUN'} — account ${account.id} (${live ? '🔴 LIVE' : 'test'} mode)\n`,
  );
  if (live && APPLY) {
    throw new Error(
      'Refusing to auto-create objects in a LIVE Stripe account. Create them in the dashboard.',
    );
  }

  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/jobocate',
  );

  const desired = await buildDesiredCatalog();
  const existingProducts = (await stripe.products.list({ limit: 100 })).data;

  let createdProducts = 0;
  let createdPrices = 0;
  const planPriceIds: Record<string, { monthly?: string; yearly?: string }> = {};

  for (const want of desired) {
    let product = existingProducts.find(
      (p) => p.metadata?.jobocate_key === want.key,
    );

    if (!product) {
      console.log(`  product MISSING → ${want.name}`);
      if (APPLY) {
        product = await stripe.products.create({
          name: want.name,
          metadata: { jobocate_key: want.key, audience: want.audience },
        });
        createdProducts++;
      }
    } else {
      console.log(`  product ok      → ${want.name} (${product.id})`);
    }

    for (const price of want.prices) {
      const found = await stripe.prices.list({
        lookup_keys: [price.lookupKey],
        limit: 1,
      });
      let priceId = found.data[0]?.id;

      if (priceId) {
        console.log(`    price ok      → ${price.lookupKey} (${priceId})`);
      } else {
        console.log(
          `    price MISSING → ${price.lookupKey}  $${(price.amount / 100).toFixed(2)}/${price.interval}`,
        );
        if (APPLY && product) {
          const created = await stripe.prices.create({
            product: product.id,
            currency: 'usd',
            unit_amount: price.amount,
            recurring: { interval: price.interval },
            lookup_key: price.lookupKey,
            nickname: price.nickname,
          });
          priceId = created.id;
          createdPrices++;
        }
      }

      if (want.audience === 'candidate' && priceId) {
        planPriceIds[want.planRef] ??= {};
        if (price.interval === 'month') planPriceIds[want.planRef].monthly = priceId;
        else planPriceIds[want.planRef].yearly = priceId;
      }
    }
  }

  // ---- Point the candidate plan docs at their prices. Employer plans need no
  // write: they resolve their price by lookup key at checkout time.
  if (APPLY) {
    const PlanModel = mongoose.model('SubscriptionPlan');
    for (const [planId, ids] of Object.entries(planPriceIds)) {
      await PlanModel.updateOne(
        { _id: planId },
        {
          $set: {
            ...(ids.monthly ? { stripePriceIdMonthly: ids.monthly } : {}),
            ...(ids.yearly ? { stripePriceIdYearly: ids.yearly } : {}),
          },
        },
      );
    }
    console.log(
      `\n✅ Created ${createdProducts} product(s), ${createdPrices} price(s); ` +
        `wired ${Object.keys(planPriceIds).length} candidate plan(s).`,
    );
  } else {
    console.log('\nRe-run with --apply to create the missing objects.');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Stripe catalog sync failed:', err.message);
  process.exit(1);
});
