'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';
import { getPlans } from '@/services/billingApi';

/**
 * Pricing, rebuilt against the "Jobocate Candidate v3" artboard.
 *
 * PRICES ARE THE LIVE ONES, NOT THE ARTBOARD'S. The mock shows $0 / $29 / $79
 * plus a Teams tier; the tiers below are $0 / $29 Pro / $59 Premium with annual
 * at -33%, which is what the backend plan entitlements are seeded to and what
 * Stripe would actually bill. Quoting the mock here would advertise a price we
 * do not charge. Change these only alongside the plan seed and /app/billing.
 *
 * The artboard's fourth tier ("Teams - Talk to us") is deliberately absent: the
 * sales-contact route it needs was deleted with /contact and /demo, so there is
 * no honest destination for it. Restore both together.
 *
 * Presentation only is v3: hairline tier grid, cobalt tick bullets, mono
 * metadata, and the FAQ as a hairline ledger rather than an accordion.
 */

const FAQS = [
  ['What counts as an auto-apply credit?', 'One credit = one application submitted on your behalf to a verified company career page. Matching, resume building and tracking never use credits.'],
  ['Can I switch plans or cancel anytime?', 'Yes. Upgrade, downgrade or cancel from your dashboard at any time. Changes take effect at the next billing cycle and unused annual time is prorated.'],
  ['What happens when I hit the free limit?', 'Your matches keep updating and your tracker keeps working. You only lose the extra auto-apply volume, and nothing already filed is affected.'],
  ['Does it invent experience?', 'No. Anything inferred goes to claims review, and export locks until you clear it.'],
  ['Are there credit packs I should watch for?', 'No. One flat monthly price per tier, cancel in two clicks, and your plan never silently renews at a higher rate.'],
];

const SIGNUP = '/app/signup';

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getPlans()
      .then((result) => {
        if (active) setTiers(Array.isArray(result?.plans) ? result.plans : []);
      })
      .catch((err) => {
        if (active) setError(err);
      });
    return () => {
      active = false;
    };
  }, []);

  const formatPrice = (tier) => {
    const amount = annual ? tier.priceYearly : tier.priceMonthly;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(tier.currency || 'usd').toUpperCase(),
      minimumFractionDigits: amount % 1 ? 2 : 0,
    }).format(amount || 0);
  };

  return (
    <>
      <Head>
        <title>Jobocate Pricing — AI Job Search Plans</title>
        <meta name="description" content="Start free, forever. Upgrade only if the extra volume earns it — no hidden auto-renewals, no credit packs, cancel anytime." />
        <link rel="canonical" href="https://jobocate.com/pricing" />
      </Head>

      <PublicLayout surface="v3">
        <div className={`jb ${styles.page}`}>
          <div className={styles.headRow}>
            <h1>Pricing</h1>

            <button type="button" className={styles.cycle} onClick={() => setAnnual((v) => !v)} aria-pressed={annual} aria-label={annual ? 'Switch to monthly billing' : 'Switch to annual billing'}>
              <span className={`${styles.cycleLabel} ${annual ? '' : styles.cycleLabelOn}`}>Monthly</span>
              <span className={styles.cycleTrack} aria-hidden="true">
                <span className={`${styles.cycleKnob} ${annual ? styles.cycleKnobOn : ''}`} />
              </span>
              <span className={`${styles.cycleLabel} ${annual ? styles.cycleLabelOn : ''}`}>Yearly</span>
            </button>
          </div>

          {error ? <p role="alert">Unable to load pricing from Stripe. Please try again.</p> : null}
          {!error && tiers.length === 0 ? <p>Loading pricing…</p> : null}
          <div className={`${styles.strip} ${tiers.length === 3 ? styles.strip3 : ''}`}>
            {tiers.map((tier) => (
              <div key={tier.type} data-testid="candidate-pricing-tier" data-tier={tier.type} className={`${styles.tier} ${tier.type === 'PRO' ? styles.tierFeatured : ''}`}>
                <div className={styles.tierHead}>
                  <h2 className={styles.tierName}>{tier.name}</h2>
                  {tier.type === 'PRO' ? <span className={styles.tierTag}>Paid</span> : null}
                </div>
                <p className={styles.tierSub}>{tier.description || (tier.type === 'FREE' ? 'Try the loop' : 'Active search')}</p>

                <p className={styles.tierPrice}>
                  <span className={styles.tierPriceValue}>{formatPrice(tier)}</span>
                  <span className={styles.tierPriceUnit}>{tier.type === 'FREE' ? 'forever' : annual ? '/year' : '/month'}</span>
                </p>

                <ul className={styles.tierFeatures}>
                  {tier.features.map((f) => (
                    <li key={f} className={styles.tierFeature}>
                      <span className={styles.tierTick} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={SIGNUP} data-testid={`candidate-pricing-tier-${tier.type}`} className={`${styles.tierCta} ${tier.type === 'PRO' ? styles.tierCtaPrimary : ''}`}>
                  {tier.type === 'FREE' ? 'Start free' : `Choose ${tier.name}`}
                </Link>
              </div>
            ))}
          </div>

          <h2 className={styles.monoLabel}>Questions</h2>
          {FAQS.map(([q, a]) => (
            <div key={q} className={styles.faqRow}>
              <h3 className={styles.faqQ}>{q}</h3>
              <p className={styles.faqA}>{a}</p>
            </div>
          ))}
          <div className={styles.rule} />
        </div>
      </PublicLayout>
    </>
  );
}
