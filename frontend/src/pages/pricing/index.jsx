'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';

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

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    sub: 'Try the loop',
    features: [
      'AI resume builder',
      'Smart job matching',
      '10 auto-apply credits / mo',
      'Application tracker',
      'Community support',
    ],
    cta: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    sub: 'Active search',
    featured: true,
    tag: 'Most picked',
    features: [
      'Unlimited job matching',
      '150 auto-apply credits / mo',
      'AI cover letters',
      'Per-role personalization',
      'Interview prep (basic)',
      'Priority email support',
    ],
    cta: 'Choose Pro',
  },
  {
    id: 'premium',
    name: 'Premium',
    sub: 'Senior search',
    features: [
      'Unlimited auto-apply',
      'Advanced personalization',
      'Full AI interview prep',
      'Salary & offer insights',
      'Priority application routing',
      '1:1 onboarding',
    ],
    cta: 'Choose Premium',
  },
];

const FAQS = [
  [
    'What counts as an auto-apply credit?',
    'One credit = one application submitted on your behalf to a verified company career page. Matching, resume building and tracking never use credits.',
  ],
  [
    'Can I switch plans or cancel anytime?',
    'Yes. Upgrade, downgrade or cancel from your dashboard at any time. Changes take effect at the next billing cycle and unused annual time is prorated.',
  ],
  [
    'What happens when I hit the free limit?',
    'Your matches keep updating and your tracker keeps working. You only lose the extra auto-apply volume, and nothing already filed is affected.',
  ],
  [
    'Does it invent experience?',
    'No. Anything inferred goes to claims review, and export locks until you clear it.',
  ],
  [
    'Are there credit packs I should watch for?',
    'No. One flat monthly price per tier, cancel in two clicks, and your plan never silently renews at a higher rate.',
  ],
];

const SIGNUP = '/app/signup';

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  const priceFor = (id) => {
    if (id === 'free') return '$0';
    if (id === 'pro') return annual ? '$19' : '$29';
    return annual ? '$39' : '$59';
  };

  return (
    <>
      <Head>
        <title>Jobocate Pricing — AI Job Search Plans</title>
        <meta
          name="description"
          content="Start free, forever. Upgrade only if the extra volume earns it — no hidden auto-renewals, no credit packs, cancel anytime."
        />
        <link rel="canonical" href="https://jobocate.com/pricing" />
      </Head>

      <PublicLayout surface="v3">
        <div className={`jb ${styles.page}`}>
          <div className={styles.headRow}>
            <h1>Pricing</h1>

            <button
              type="button"
              className={styles.cycle}
              onClick={() => setAnnual((v) => !v)}
              aria-pressed={annual}
              aria-label={annual ? 'Switch to monthly billing' : 'Switch to annual billing'}
            >
              <span
                className={`${styles.cycleLabel} ${annual ? '' : styles.cycleLabelOn}`}
              >
                Monthly
              </span>
              <span className={styles.cycleTrack} aria-hidden="true">
                <span className={`${styles.cycleKnob} ${annual ? styles.cycleKnobOn : ''}`} />
              </span>
              <span
                className={`${styles.cycleLabel} ${annual ? styles.cycleLabelOn : ''}`}
              >
                Yearly -33%
              </span>
            </button>
          </div>

          <div className={`${styles.strip} ${styles.strip3}`}>
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`${styles.tier} ${tier.featured ? styles.tierFeatured : ''}`}
              >
                <div className={styles.tierHead}>
                  <h2 className={styles.tierName}>{tier.name}</h2>
                  {tier.tag ? <span className={styles.tierTag}>{tier.tag}</span> : null}
                </div>
                <p className={styles.tierSub}>{tier.sub}</p>

                <p className={styles.tierPrice}>
                  <span className={styles.tierPriceValue}>{priceFor(tier.id)}</span>
                  <span className={styles.tierPriceUnit}>
                    {tier.id === 'free' ? 'forever' : '/mo'}
                  </span>
                </p>

                <ul className={styles.tierFeatures}>
                  {tier.features.map((f) => (
                    <li key={f} className={styles.tierFeature}>
                      <span className={styles.tierTick} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={SIGNUP}
                  className={`${styles.tierCta} ${tier.featured ? styles.tierCtaPrimary : ''}`}
                >
                  {tier.cta}
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
