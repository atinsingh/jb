'use client';

import Link from 'next/link';
import Image from 'next/image';

import companyone from '@/assets/home/companyone.png';
import companytwo from '@/assets/home/companytwo.png';
import companythree from '@/assets/home/companythree.png';
import companyfour from '@/assets/home/companyfour.png';
import companyfive from '@/assets/home/companyfive.png';

import {
  HERO,
  HERO_STATS,
  PROOF,
  AUDIENCES,
  MENTORS,
  CAPABILITIES,
  SITE_METRICS,
  TESTIMONIALS,
  CLOSING,
  HISTOGRAM_BARS,
  HISTOGRAM_THRESHOLD_INDEX,
  histogram,
  sparkline,
} from './content';
import styles from './HomeV3.module.css';

/**
 * Marketing home, Candidate v3.
 *
 * Source: "Jobocate Candidate v3.dc.html", artboard "Marketing home".
 *
 * Colour, type and spacing come from the .jbv3 token block in
 * src/styles/tokens.css. No literal hex lives in this file or its stylesheet,
 * so retheming is a token edit rather than a component edit.
 *
 * The visual language is hairline-first: a 1px grid gap over a line-coloured
 * background *is* the divider, which is why the strips below use `gap: 1px`
 * rather than a border on each cell.
 */

const LOGOS = [companyone, companytwo, companythree, companyfour, companyfive];
const BARS = histogram();
const THRESHOLD_PCT = (HISTOGRAM_THRESHOLD_INDEX / HISTOGRAM_BARS) * 100;

export default function HomeV3() {
  return (
    <div className={styles.root}>
      {/* Decorative dot field. aria-hidden and pointer-events:none, since it
          carries no meaning and must never intercept a click. */}
      <div className={styles.dots} aria-hidden="true" />

      <div className={styles.inner}>
        {/* ------------------------------------------------------------- */}
        {/* Hero                                                           */}
        {/* ------------------------------------------------------------- */}
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              <span className={styles.blip} aria-hidden="true" />
              {HERO.eyebrow}
            </p>
            <h1 className={styles.h1}>{HERO.headline}</h1>
            <p className={styles.sub}>{HERO.sub}</p>
            <div className={styles.ctaRow}>
              <Link href={HERO.primaryCta.href} className={`${styles.btn} ${styles.btnPrimary}`}>
                {HERO.primaryCta.label}
              </Link>
              <Link href={HERO.secondaryCta.href} className={`${styles.btn} ${styles.btnGhost}`}>
                {HERO.secondaryCta.label}
              </Link>
            </div>
          </div>

          {/* Coverage distribution. Presentational: the same figures are named
              in the stat strip directly below, so this is aria-hidden rather
              than announced as a chart with no accessible values. */}
          <div className={styles.histWrap} aria-hidden="true">
            <p className={styles.monoLabel}>{HERO.histogramLabel}</p>
            <div className={styles.hist}>
              {BARS.map((bar, i) => (
                <span
                  key={i}
                  className={bar.above ? `${styles.tick} ${styles.tickOn}` : styles.tick}
                  style={{ height: `${bar.height}%` }}
                />
              ))}
            </div>
            <div className={styles.axis}>
              <span className={styles.axisMin}>{HERO.axisMin}</span>
              <span className={styles.axisMax}>{HERO.axisMax}</span>
              <span className={styles.thresholdRule} style={{ left: `${THRESHOLD_PCT}%` }} />
              <span className={styles.thresholdLabel} style={{ left: `${THRESHOLD_PCT}%` }}>
                {HERO.thresholdLabel}
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Headline metrics                                               */}
        {/* ------------------------------------------------------------- */}
        <section className={`${styles.strip} ${styles.strip4}`}>
          {HERO_STATS.map((stat) => (
            <div key={stat.key} className={styles.cell}>
              <p className={styles.monoLabel}>{stat.key}</p>
              <p className={styles.statValue}>
                <span>{stat.value}</span>
                {stat.unit ? <span className={styles.statUnit}>{stat.unit}</span> : null}
              </p>
            </div>
          ))}
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Proof band                                                     */}
        {/* ------------------------------------------------------------- */}
        <section className={styles.proof}>
          <p className={styles.monoLabel}>{PROOF.label}</p>
          <ul className={styles.logos}>
            {LOGOS.map((logo, i) => (
              <li key={PROOF.logos[i]}>
                <Image src={logo} alt="" width={96} height={26} className={styles.logo} />
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Two audiences                                                  */}
        {/* ------------------------------------------------------------- */}
        <section className={`${styles.strip} ${styles.strip2}`}>
          {AUDIENCES.map((audience) => (
            <div key={audience.who} className={`${styles.cell} ${styles.audience}`}>
              <p className={`${styles.monoLabel} ${styles.accent}`}>{audience.who}</p>
              <h2 className={styles.h3}>{audience.claim}</h2>
              <dl className={styles.lines}>
                {audience.lines.map((line) => (
                  <div key={line.k} className={styles.line}>
                    <dt>{line.k}</dt>
                    <dd>{line.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Mentors                                                        */}
        {/* ------------------------------------------------------------- */}
        <section className={styles.mentors}>
          <div className={styles.mentorsHead}>
            <div>
              <p className={`${styles.monoLabel} ${styles.accent}`}>{MENTORS.eyebrow}</p>
              <h2 className={styles.h2}>{MENTORS.heading}</h2>
              <p className={styles.body}>{MENTORS.body}</p>
            </div>
            <Link
              href={MENTORS.cta.href}
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
            >
              {MENTORS.cta.label}
            </Link>
          </div>

          <ul className={styles.mentorGrid}>
            {MENTORS.people.map((person) => (
              <li key={person.id} className={styles.mentor}>
                {/* The initials monogram is the design's own placeholder
                    treatment, not a stand-in for a photo we failed to source. */}
                <div className={styles.mentorAvatar} aria-hidden="true">
                  <span>{person.initials}</span>
                </div>
                <div className={styles.mentorBody}>
                  <p className={styles.mentorName}>{person.name}</p>
                  <p className={styles.mentorFocus}>{person.focus}</p>
                  <p className={styles.mentorMeta}>
                    <span className={styles.accent}>{`★ ${person.rating}`}</span>
                    <span className={styles.mentorRate}>{`${person.rate}/h`}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Capabilities ledger                                            */}
        {/* ------------------------------------------------------------- */}
        <section className={styles.caps}>
          <h2 className={styles.srOnly}>What Jobocate does</h2>
          {CAPABILITIES.map((cap) => (
            <article key={cap.n} className={styles.cap}>
              <span className={styles.capN}>{cap.n}</span>
              <h3 className={styles.capK}>{cap.k}</h3>
              <p className={styles.capV}>{cap.v}</p>
              <svg
                className={styles.spark}
                viewBox="0 0 240 40"
                width="240"
                height="40"
                aria-hidden="true"
              >
                <polyline
                  points={sparkline(cap.phase)}
                  fill="none"
                  stroke="var(--jb-v3-accent)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </article>
          ))}
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Platform metrics                                               */}
        {/* ------------------------------------------------------------- */}
        <section className={`${styles.strip} ${styles.strip4}`}>
          {SITE_METRICS.map((metric) => (
            <div key={metric.key} className={`${styles.cell} ${styles.cellPanel}`}>
              <p className={styles.monoLabel}>{metric.key}</p>
              <p className={styles.metricValue}>{metric.value}</p>
            </div>
          ))}
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Testimonials                                                   */}
        {/* ------------------------------------------------------------- */}
        <section className={`${styles.strip} ${styles.strip3}`}>
          {TESTIMONIALS.map((t) => (
            <figure key={t.attribution} className={`${styles.cell} ${styles.quote}`}>
              <blockquote className={styles.quoteBody}>{t.quote}</blockquote>
              <figcaption className={styles.monoLabel}>{t.attribution}</figcaption>
            </figure>
          ))}
        </section>

        {/* ------------------------------------------------------------- */}
        {/* Closing                                                        */}
        {/* ------------------------------------------------------------- */}
        <section className={styles.closing}>
          <h2 className={styles.closingH}>{CLOSING.heading}</h2>
          <Link href={CLOSING.cta.href} className={`${styles.btn} ${styles.btnPrimary}`}>
            {CLOSING.cta.label}
          </Link>
        </section>
      </div>
    </div>
  );
}
