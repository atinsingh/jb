'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

/**
 * Pricing — "Fares".
 *
 * Card treatment, guarantees strip, fare-conditions accordion and amber closing
 * CTA are ported from the approved `Pricing.dc.html` mock.
 *
 * The mock shows a two-cabin structure at $0 / $15. The tiers below are the
 * LIVE ones ($0 / $29 Pro / $59 Premium, annual −33%), which is what the
 * backend plan entitlements are seeded to and what Stripe would actually
 * charge. Quoting the mock's prices here would advertise a price we don't bill.
 * Change these only alongside the plan seed and /app/billing.
 */

const TIERS = [
  {
    id: 'free',
    cabin: 'ECONOMY — FREE',
    name: 'Free',
    blurb: 'Everything you need to run a focused, controlled search.',
    note: 'free forever',
    includesLabel: 'Includes',
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
    cabin: 'BUSINESS — PRO',
    name: 'Pro',
    blurb: 'For an active search — more volume, still fully under your control.',
    featured: true,
    includesLabel: 'Everything in Free, plus',
    features: [
      'Unlimited job matching',
      '150 auto-apply credits / mo',
      'AI cover letters',
      'Per-role personalization',
      'Interview prep (basic)',
      'Priority email support',
    ],
    cta: 'Start Pro trial',
  },
  {
    id: 'premium',
    cabin: 'FIRST — PREMIUM',
    name: 'Premium',
    blurb: 'The full search, running on your terms.',
    includesLabel: 'Everything in Pro, plus',
    features: [
      'Unlimited auto-apply',
      'Advanced personalization',
      'Full AI interview prep',
      'Salary & offer insights',
      'Priority application routing',
      '1:1 onboarding',
    ],
    cta: 'Start Premium trial',
  },
];

const GUARANTEES = [
  'NO HIDDEN AUTO-RENEWALS',
  'CANCEL ANYTIME · TWO CLICKS',
  'NOTHING SENDS WITHOUT YOUR SAY-SO',
];

const FAQS = [
  ['What counts as an auto-apply credit?', 'One credit = one application submitted on your behalf to a verified company career page. Matching, resume building and tracking never use credits.'],
  ['Can I switch plans or cancel anytime?', 'Yes. Upgrade, downgrade or cancel from your dashboard at any time. Changes take effect at the next billing cycle and unused annual time is prorated.'],
  ['What happens when I hit the free limit?', 'Your matches keep updating and your tracker keeps working. You only lose the extra auto-apply volume — nothing already filed is affected.'],
  ['Are there credit packs I should watch for?', 'No. One flat monthly price per tier, cancel in two clicks, and your plan never silently renews at a higher rate.'],
  ['How does Enterprise pricing work?', 'Enterprise is priced per seat with volume tiers, and includes SSO, admin controls and a dedicated success manager. Talk to sales for a quote tailored to your team.'],
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [faq, setFaq] = useState(-1);

  const priceFor = (id) => {
    if (id === 'free') return '$0';
    if (id === 'pro') return annual ? '$19' : '$29';
    return annual ? '$39' : '$59';
  };
  const noteFor = (id) =>
    id === 'free' ? 'free forever' : annual ? 'per month · billed annually' : 'per month · cancel anytime';

  return (
    <>
      <Head>
        <title>Jobocate Pricing — AI Job Search Plans</title>
        <meta
          name="description"
          content="Start free, forever. Upgrade only if the extra volume earns it — no hidden auto-renewals, no credit packs, cancel anytime."
        />
      </Head>

      <PublicLayout>
        <div className="pr">
          {/* ---------- HERO ---------- */}
          <section className="pr__hero">
            <span className="pr__eyebrow">FARES</span>
            <h1 className="pr__h1">
              One search, <span className="jb-em">three cabins.</span>
            </h1>
            <p className="pr__lede">
              Start free, forever. Upgrade only if the extra legroom earns it — cancel anytime, no
              hidden auto-renewals or credit packs.
            </p>

            <div className="pr__toggle" role="radiogroup" aria-label="Billing period">
              <button
                type="button"
                role="radio"
                aria-checked={!annual}
                className={`pr__tog${!annual ? ' pr__tog--on' : ''}`}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={annual}
                className={`pr__tog${annual ? ' pr__tog--on' : ''}`}
                onClick={() => setAnnual(true)}
              >
                Annual <span className="pr__save">−33%</span>
              </button>
            </div>
          </section>

          {/* ---------- PLANS ---------- */}
          <section className="pr__plans">
            {TIERS.map((t) => (
              <article key={t.id} className={`pr__plan${t.featured ? ' pr__plan--featured' : ''}`}>
                {t.featured && <span className="pr__pop">MOST POPULAR</span>}
                <div className="pr__planhead">
                  <span className="pr__cabin">{t.cabin}</span>
                  <div className="pr__pricerow">
                    <span className="pr__price">{priceFor(t.id)}</span>
                    <span className="pr__pricenote">{noteFor(t.id)}</span>
                  </div>
                  <p className="pr__blurb">{t.blurb}</p>
                </div>

                <div className="pr__features">
                  <span className="pr__inclabel">{t.includesLabel}</span>
                  {t.features.map((f) => (
                    <span key={f} className="pr__feature">
                      <span className="pr__tick" aria-hidden="true">✓</span>
                      {f}
                    </span>
                  ))}
                </div>

                <Link
                  href={appRoute('App Sign Up.dc.html')}
                  className={`pr__cta${t.featured ? ' pr__cta--green' : ' pr__cta--ghost'}`}
                >
                  {t.cta}
                </Link>
              </article>
            ))}
          </section>

          {/* ---------- ENTERPRISE ---------- */}
          <section className="pr__entwrap">
            <div className="pr__ent">
              <div>
                <span className="pr__eyebrow">ENTERPRISE & OUTPLACEMENT</span>
                <h2 className="pr__h3">Move a whole team to their next roles</h2>
                <p className="pr__blurb">
                  SSO, seat management, a dedicated success manager and bulk outplacement for
                  workforce transitions. Custom pricing per seat.
                </p>
              </div>
              <Link href={appRoute('Book Demo.dc.html')} className="pr__cta pr__cta--green">
                Talk to sales →
              </Link>
            </div>
          </section>

          {/* ---------- GUARANTEES ---------- */}
          <section className="pr__guarantees">
            {GUARANTEES.map((g) => (
              <span key={g} className="pr__guarantee">{g}</span>
            ))}
          </section>

          {/* ---------- FARE CONDITIONS ---------- */}
          <section className="pr__faqwrap">
            <h2 className="pr__h2 pr__h2--center">
              Fare <span className="jb-em">conditions.</span>
            </h2>
            <div className="pr__faqs">
              {FAQS.map(([q, a], i) => {
                const open = faq === i;
                return (
                  <div key={q} className="pr__faq">
                    <button
                      type="button"
                      className="pr__faqq"
                      aria-expanded={open}
                      aria-controls={`pr-faq-${i}`}
                      onClick={() => setFaq(open ? -1 : i)}
                    >
                      <span>{q}</span>
                      <span className="pr__faqicon" aria-hidden="true">{open ? '−' : '+'}</span>
                    </button>
                    {open && <p className="pr__faqa" id={`pr-faq-${i}`}>{a}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ---------- FINAL ---------- */}
          <section className="pr__finalwrap">
            <div className="pr__final">
              <h2 className="pr__h2">
                Board free. <span className="jb-em">Upgrade if it earns it.</span>
              </h2>
              <Link href={appRoute('App Sign Up.dc.html')} className="pr__cta pr__cta--amber">
                Chart my route →
              </Link>
            </div>
          </section>
        </div>

        <style jsx>{`
          .pr { --pad: 48px; max-width: 1280px; margin: 0 auto; font-family: var(--jb-font-sans); }
          .pr :global(*) { box-sizing: border-box; }

          .pr__eyebrow {
            display: block; font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500;
            letter-spacing: 0.24em; color: var(--jb-d-accent);
          }
          .pr__h1 {
            margin: 0; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(34px, 5vw, 62px); line-height: 1.02;
          }
          .pr__h2 {
            margin: 0; font-family: var(--jb-font-display); font-weight: 400;
            font-size: clamp(28px, 3.2vw, 44px); line-height: 1.1;
          }
          .pr__h2--center { text-align: center; }
          .pr__h3 { margin: 0; font-family: var(--jb-font-display); font-weight: 400; font-size: clamp(22px, 2.4vw, 30px); line-height: 1.1; }
          .pr__lede { margin: 0; max-width: 520px; font-size: 15px; line-height: 1.6; color: var(--jb-d-ink-65); }

          .pr__hero {
            padding: 64px var(--pad) 24px;
            display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
          }

          /* ---- billing toggle ---- */
          .pr__toggle {
            display: inline-flex; gap: 4px; padding: 4px; margin-top: 8px;
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-card); border-radius: 999px;
          }
          .pr__tog {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 10px 20px; min-height: 44px; border-radius: 999px;
            background: transparent; border: none; cursor: pointer;
            font-family: var(--jb-font-sans); font-size: 14px; font-weight: 600;
            color: var(--jb-d-ink-65);
          }
          .pr__tog--on { background: var(--jb-d-ink); color: var(--jb-d-bg); }
          .pr__save {
            font-family: var(--jb-font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
            background: var(--jb-d-accent); color: var(--jb-d-bg); padding: 3px 7px; border-radius: 999px;
          }

          /* ---- plans ---- */
          .pr__plans {
            padding: 32px var(--pad) 40px;
            display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); gap: 20px;
            align-items: stretch;
          }
          .pr__plan {
            position: relative;
            background: var(--jb-d-panel); border: 1px solid var(--jb-d-line-strong);
            border-radius: 16px; padding: 36px;
            display: flex; flex-direction: column; gap: 22px;
          }
          .pr__plan--featured { background: var(--jb-d-accent-tint); border-color: var(--jb-d-accent); }
          .pr__pop {
            position: absolute; top: -13px; left: 36px;
            background: var(--jb-d-accent); color: var(--jb-d-bg);
            font-family: var(--jb-font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.14em;
            padding: 6px 12px; border-radius: 999px;
          }
          .pr__planhead { display: flex; flex-direction: column; gap: 8px; }
          .pr__cabin {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 600;
            letter-spacing: 0.2em; color: var(--jb-d-ink-65);
          }
          .pr__plan--featured .pr__cabin { color: var(--jb-d-accent); }
          .pr__pricerow { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
          .pr__price { font-family: var(--jb-font-display); font-size: clamp(40px, 5vw, 56px); line-height: 1; }
          .pr__pricenote { font-size: 14px; color: var(--jb-d-ink-55); }
          .pr__blurb { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--jb-d-ink-65); }

          .pr__features {
            display: flex; flex-direction: column; gap: 12px;
            border-top: 1px solid var(--jb-d-line-card); padding-top: 22px;
          }
          .pr__inclabel {
            font-family: var(--jb-font-mono); font-size: 11px; letter-spacing: 0.12em;
            text-transform: uppercase; color: var(--jb-d-ink-55);
          }
          .pr__feature { display: flex; gap: 10px; font-size: 14px; line-height: 1.5; color: var(--jb-d-ink-85); }
          .pr__tick { color: var(--jb-d-accent); font-weight: 700; }

          :global(.pr__cta) {
            margin-top: auto;
            display: inline-flex; align-items: center; justify-content: center;
            min-height: 48px; padding: 15px 28px; border-radius: 999px;
            font-family: var(--jb-font-sans); font-size: 14px; font-weight: 700;
            text-decoration: none; border: 1.5px solid transparent; text-align: center;
            transition: background-color 0.18s ease, border-color 0.18s ease;
          }
          :global(.pr__cta--green) { background: var(--jb-d-accent); color: var(--jb-d-bg); }
          :global(.pr__cta--green:hover) { background: var(--jb-d-accent-hi); }
          :global(.pr__cta--ghost) { border-color: var(--jb-d-line-btn); color: var(--jb-d-ink); }
          :global(.pr__cta--ghost:hover) { border-color: var(--jb-d-accent); color: var(--jb-d-accent); }
          :global(.pr__cta--amber) { background: var(--jb-d-amber); color: var(--jb-d-bg); margin-top: 6px; }
          :global(.pr__cta--amber:hover) { background: var(--jb-d-amber-hi); }

          /* ---- enterprise ---- */
          .pr__entwrap { padding: 0 var(--pad) 40px; }
          .pr__ent {
            background: var(--jb-d-footer); border: 1px solid var(--jb-d-line-card);
            border-radius: 16px; padding: 40px;
            display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap;
          }
          .pr__ent > div:first-child { display: flex; flex-direction: column; gap: 10px; max-width: 560px; }

          /* ---- guarantees ---- */
          .pr__guarantees {
            margin: 0 var(--pad) 40px; display: flex; justify-content: center; flex-wrap: wrap;
            border-top: 1px solid var(--jb-d-line-card); border-bottom: 1px solid var(--jb-d-line-card);
          }
          .pr__guarantee {
            font-family: var(--jb-font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.16em;
            color: var(--jb-d-ink-65); padding: 14px 28px; border-right: 1px solid var(--jb-d-line);
          }
          .pr__guarantee:last-child { border-right: none; }

          /* ---- faq ---- */
          .pr__faqwrap {
            max-width: 760px; margin: 0 auto; width: 100%;
            padding: 24px var(--pad) 56px; display: flex; flex-direction: column; gap: 22px;
          }
          .pr__faqs { display: flex; flex-direction: column; gap: 12px; }
          .pr__faq { background: var(--jb-d-glass-hi); border: 1px solid var(--jb-d-line-card); border-radius: 10px; overflow: hidden; }
          .pr__faqq {
            width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
            padding: 18px 22px; min-height: 44px; background: none; border: none; cursor: pointer;
            text-align: left; font-family: inherit; font-size: 14.5px; font-weight: 600; color: var(--jb-d-ink);
          }
          .pr__faqq:hover { background: rgba(242, 236, 219, 0.04); }
          .pr__faqicon { font-family: var(--jb-font-display); font-size: 20px; color: var(--jb-d-accent); flex: none; }
          .pr__faqa { margin: 0; padding: 0 22px 18px; font-size: 13.5px; line-height: 1.6; color: var(--jb-d-ink-65); }

          /* ---- final ---- */
          .pr__finalwrap { padding: 0 var(--pad) 64px; }
          .pr__final {
            border: 1px solid var(--jb-d-line-strong);
            background: radial-gradient(ellipse at 50% 120%, rgba(143, 214, 163, 0.25), transparent 70%);
            border-radius: 16px; padding: 56px var(--pad);
            display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
          }

          @media (max-width: 760px) {
            .pr { --pad: 20px; }
            .pr__hero { padding: 36px var(--pad) 16px; }
            .pr__plans { padding: 28px var(--pad) 32px; }
            .pr__plan { padding: 24px; }
            .pr__pop { left: 24px; }
            .pr__ent { padding: 24px; }
            .pr__guarantees { border: none; gap: 8px; margin: 0 var(--pad) 32px; justify-content: flex-start; }
            .pr__guarantee {
              border: 1px solid var(--jb-d-line-strong); border-radius: 999px;
              padding: 7px 13px; font-size: 11px; letter-spacing: 0.12em;
            }
            :global(.pr__cta) { width: 100%; }
            .pr__final { padding: 36px 24px; }
          }
        `}</style>
      </PublicLayout>
    </>
  );
}
