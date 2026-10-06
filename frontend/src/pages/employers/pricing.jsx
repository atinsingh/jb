'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';
import { getEmployerPlans } from '@/services/billingApi';

/**
 * Employer pricing.
 *
 * Restyled to the v3 language using the same tier/FAQ patterns as /pricing, so
 * the two pricing pages read as one system. The v3 bundle has no employer
 * pricing artboard.
 *
 * TIER DATA IS UNCHANGED - names, monthly/annual prices and feature lists are
 * exactly as they were. Only the presentation moved.
 *
 * Two things from the previous build are deliberately gone:
 *
 * - The comparison matrix. It repeated the feature lists directly above it in
 *   a second form, with a hairline under all eight rows.
 * - The ROI panel. Its figures ("92 hrs saved / mo", "-$13,800 loaded
 *   recruiter cost") were invented, and a savings claim we cannot source does
 *   not belong on a pricing page.
 *
 * The Enterprise tier now points at self-serve signup rather than a sales
 * contact, because /contact and /demo were deleted. Restore them together if
 * an enterprise enquiry path is wanted back.
 */

const SIGNUP = '/app/signup?as=employer';

const FAQS = [
  ['How are credits used?', 'Model-backed features share one monthly credit balance. Usage is measured and rounded once per operation, including retries. Cached results and the local content heuristic use no credits.'],
  ['Can I post a job for free?', 'Yes. Free lets you post your first role. You only pay when you need more slots, seats or automation.'],
  ['How do job slots work?', 'A slot is one active, published requisition. Closing or pausing a req frees its slot, and keeps all its candidate data.'],
  ['Is candidate data handled compliantly?', 'Yes. EEO reporting, GDPR/CCPA data-request tooling and configurable retention windows are built in. Enterprise adds a DPA and security review.'],
];

export default function EmployerPricing() {
  const [annual, setAnnual] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    getEmployerPlans()
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
      currency: String(tier.currency || 'cad').toUpperCase(),
      minimumFractionDigits: annual && amount % 1 ? 2 : 0,
    }).format(amount || 0);
  };

  return (
    <>
      <Head>
        <title>Employer Pricing — Hiring Plans | Jobocate</title>
        <meta name="description" content="Plans that scale with your hiring: job slots, team seats, credits and sourcing credits. Start with your first role free." />
        <link rel="canonical" href="https://jobocate.com/employers/pricing" />
      </Head>

      <PublicLayout variant="employer" surface="v3">
        <div className={`jb ${styles.page}`}>
          <div className={styles.headRow}>
            <h1>Employer pricing</h1>

            <button type="button" className={styles.cycle} onClick={() => setAnnual((v) => !v)} aria-pressed={annual} aria-label={annual ? 'Switch to monthly billing' : 'Switch to annual billing'}>
              <span className={`${styles.cycleLabel} ${annual ? '' : styles.cycleLabelOn}`}>Monthly</span>
              <span className={styles.cycleTrack} aria-hidden="true">
                <span className={`${styles.cycleKnob} ${annual ? styles.cycleKnobOn : ''}`} />
              </span>
              <span className={`${styles.cycleLabel} ${annual ? styles.cycleLabelOn : ''}`}>Yearly</span>
            </button>
          </div>

          {error ? <p role="alert">Unable to load employer pricing from Stripe. Please try again.</p> : null}
          {!error && tiers.length === 0 ? <p>Loading pricing…</p> : null}
          <div className={`${styles.strip} ${tiers.length === 4 ? styles.strip4 : ''}`}>
            {tiers.map((t) => (
              <div key={t.key} data-testid="employer-pricing-tier" data-tier={t.key} className={`${styles.tier} ${t.popular ? styles.tierFeatured : ''}`}>
                <div className={styles.tierHead}>
                  <h2 className={styles.tierName}>{t.name}</h2>
                  {t.popular ? <span className={styles.tierTag}>Most picked</span> : null}
                </div>
                <p className={styles.tierSub}>{t.tagline}</p>

                <p className={styles.tierPrice}>
                  <span className={styles.tierPriceValue}>{formatPrice(t)}</span>
                  <span className={styles.tierPriceUnit}>{t.key === 'free' ? 'forever' : annual ? '/year' : '/month'}</span>
                </p>

                <ul className={styles.tierFeatures}>
                  {(t.levers || []).map(([label, value]) => (
                    <li key={label} className={styles.tierFeature}>
                      <span className={styles.tierTick} aria-hidden="true" />
                      <span>
                        {value} {label.replace(/\bAI[- ]?/g, '')}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={SIGNUP} data-testid={`employer-pricing-tier-${t.key}`} className={`${styles.tierCta} ${t.popular ? styles.tierCtaPrimary : ''}`}>
                  {t.key === 'free' ? 'Start free' : t.selfServe ? `Choose ${t.name}` : 'Contact sales'}
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
