'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';

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

const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    sub: 'First few hires',
    m: 99,
    a: 79,
    features: [
      '1 active job slot',
      '2 team seats',
      '100 AI actions / mo',
      '25 sourcing credits',
      'Calendar integration',
      'Email support',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    sub: 'A few teams',
    m: 299,
    a: 239,
    features: [
      '5 active job slots',
      '8 team seats',
      '500 AI actions / mo',
      '150 sourcing credits',
      'Slack integration',
      'Priority email support',
    ],
  },
  {
    key: 'scale',
    name: 'Scale',
    sub: 'High volume',
    m: 699,
    a: 549,
    popular: true,
    features: [
      '20 active job slots',
      '25 team seats',
      '2,500 AI actions / mo',
      '750 sourcing credits',
      'Greenhouse, Lever, SSO',
      'Dedicated CSM',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    sub: 'Custom scale',
    custom: true,
    features: [
      'Unlimited slots & seats',
      'Custom AI actions',
      'Any ATS + API',
      'SAML SSO / SCIM',
      '24/7 support + SLA',
      'Security review & DPA',
    ],
  },
];

const FAQS = [
  [
    'What counts as an "AI action"?',
    'Any automated step: screening an applicant, drafting outreach, generating a scorecard, or scheduling an interview. Most teams use well under their monthly allowance.',
  ],
  [
    'Can I post a job for free?',
    'Yes. Starter lets you post your first role and run basic matching at no cost. You only pay when you need more slots, seats or automation.',
  ],
  [
    'How do job slots work?',
    'A slot is one active, published requisition. Closing or pausing a req frees its slot, and keeps all its candidate data.',
  ],
  [
    'Do you integrate with our ATS?',
    'Scale and Enterprise sync two-way with Greenhouse, Lever, Workday and Ashby. Field mapping and sync frequency are configurable.',
  ],
  [
    'Is candidate data handled compliantly?',
    'Yes. EEO reporting, GDPR/CCPA data-request tooling and configurable retention windows are built in. Enterprise adds a DPA and security review.',
  ],
];

export default function EmployerPricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <Head>
        <title>Employer Pricing — Hiring Plans | Jobocate</title>
        <meta
          name="description"
          content="Plans that scale with your hiring: job slots, team seats, AI actions and sourcing credits. Start with your first role free."
        />
        <link rel="canonical" href="https://jobocate.com/employers/pricing" />
      </Head>

      <PublicLayout variant="employer" surface="v3">
        <div className={`jb ${styles.page}`}>
          <div className={styles.headRow}>
            <h1>Employer pricing</h1>

            <button
              type="button"
              className={styles.cycle}
              onClick={() => setAnnual((v) => !v)}
              aria-pressed={annual}
              aria-label={annual ? 'Switch to monthly billing' : 'Switch to annual billing'}
            >
              <span className={`${styles.cycleLabel} ${annual ? '' : styles.cycleLabelOn}`}>
                Monthly
              </span>
              <span className={styles.cycleTrack} aria-hidden="true">
                <span className={`${styles.cycleKnob} ${annual ? styles.cycleKnobOn : ''}`} />
              </span>
              <span className={`${styles.cycleLabel} ${annual ? styles.cycleLabelOn : ''}`}>
                Yearly -20%
              </span>
            </button>
          </div>

          <div className={`${styles.strip} ${styles.strip4}`}>
            {TIERS.map((t) => (
              <div
                key={t.key}
                className={`${styles.tier} ${t.popular ? styles.tierFeatured : ''}`}
              >
                <div className={styles.tierHead}>
                  <h2 className={styles.tierName}>{t.name}</h2>
                  {t.popular ? <span className={styles.tierTag}>Most picked</span> : null}
                </div>
                <p className={styles.tierSub}>{t.sub}</p>

                <p className={styles.tierPrice}>
                  <span className={styles.tierPriceValue}>
                    {t.custom ? 'Custom' : `$${annual ? t.a : t.m}`}
                  </span>
                  {t.custom ? null : <span className={styles.tierPriceUnit}>/mo</span>}
                </p>

                <ul className={styles.tierFeatures}>
                  {t.features.map((f) => (
                    <li key={f} className={styles.tierFeature}>
                      <span className={styles.tierTick} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={SIGNUP}
                  className={`${styles.tierCta} ${t.popular ? styles.tierCtaPrimary : ''}`}
                >
                  Start free
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
