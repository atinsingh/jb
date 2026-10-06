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
  ['What uses credits?', 'Resume generation and rewriting use your plan allowance. Resume comparison uses local checks and does not use generation credits.'],
  ['Can I manage my plan?', 'You can manage your subscription and billing from your account’s billing page.'],
  ['What happens when I use my allowance?', 'New generation requests pause until your allowance resets or you upgrade. Your saved resumes remain available, and you can keep comparing documents.'],
  ['Can I edit my resume?', 'Yes. Refine the wording, keep your versions together, and review the details before downloading your PDF.'],
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
        <title>Jobocate Pricing — Job Search Plans</title>
        <meta name="description" content="Choose a plan for comparing, creating and refining your resumes with Jobocate." />
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
          <div className={`${styles.strip} ${styles.pricingGrid}`}>
            {tiers.map((tier) => (
              <div key={tier.type} data-testid="candidate-pricing-tier" data-tier={tier.type} className={`${styles.tier} ${tier.type === 'PRO' ? styles.tierFeatured : ''}`}>
                <div className={styles.tierHead}>
                  <h2 className={styles.tierName}>{tier.name}</h2>
                  {tier.type === 'PRO' ? <span className={styles.tierTag}>Paid</span> : null}
                </div>
                <p className={styles.tierSub}>{tier.type === 'FREE' ? 'Explore resume tools at your own pace.' : 'More room to create and refine your resume.'}</p>

                <p className={styles.tierPrice}>
                  <span className={styles.tierPriceValue}>{formatPrice(tier)}</span>
                  <span className={styles.tierPriceUnit}>{tier.type === 'FREE' ? 'forever' : annual ? '/year' : '/month'}</span>
                </p>

                <ul className={styles.tierFeatures}>
                  {tier.features.map((f) => (
                    <li key={f} className={styles.tierFeature}>
                      <span className={styles.tierTick} aria-hidden="true" />
                      <span>{f.replace(/\bAI[- ]?/g, '')}</span>
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
