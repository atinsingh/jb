'use client';

import Head from 'next/head';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';

/**
 * About, rebuilt against the "Jobocate Candidate v3" artboard.
 *
 * !! FACTS NEED CONFIRMING BEFORE THIS SHIPS. The four figures in FACTS below
 * (founding year, team size, recruiters consulted, markets) come from the
 * design mockup, not from anyone at the company. They are claims about the
 * business, so they are worse than the placeholder metrics elsewhere: publish
 * them unverified and the About page states something we have not checked.
 * Confirm each with the founders or delete the strip.
 *
 * The previous version of this page was a 364-line narrative on the old dark
 * marketing system. The artboard replaces it with a headline, a facts strip and
 * three principles, so the narrative is gone rather than restyled.
 */

const HEADLINE = 'The screen is the bottleneck, not the applying.';
const LEDE =
  'We build for the moment a recruiter spends nine seconds on a page. Everything else follows from that.';

/** Unverified — see the file header. */
const FACTS = [
  { k: 'Founded', v: '2024' },
  { k: 'Team', v: '11' },
  { k: 'Recruiters consulted', v: '100+' },
  { k: 'Markets', v: '6' },
];

const PRINCIPLES = [
  {
    n: '01',
    k: 'Measured, not guessed',
    v: 'Every number on screen traces to a parsed posting or a real event.',
  },
  {
    n: '02',
    k: 'Defensible by default',
    v: 'A résumé you cannot defend in a screen is worse than no résumé.',
  },
  {
    n: '03',
    k: 'Speed without slop',
    v: 'Ninety seconds per application, none of them generic.',
  },
];

export default function About() {
  return (
    <>
      <Head>
        <title>About Jobocate — Why we build for the screen</title>
        <meta
          name="description"
          content="Jobocate is built for the moment a recruiter spends nine seconds on a résumé. Measured, not guessed; defensible by default."
        />
        <link rel="canonical" href="https://jobocate.com/about" />
      </Head>

      <PublicLayout surface="v3">
        <div className={`jb ${styles.page} ${styles.pageNarrow}`}>
          <h1>{HEADLINE}</h1>
          <p className={styles.lede}>{LEDE}</p>

          <div className={`${styles.strip} ${styles.strip4}`}>
            {FACTS.map((fact) => (
              <div key={fact.k} className={styles.factCell}>
                <p className={styles.monoLabel}>{fact.k}</p>
                <p className={styles.factValue}>{fact.v}</p>
              </div>
            ))}
          </div>

          <section className={styles.ledger} aria-label="Principles">
            {PRINCIPLES.map((p) => (
              <article key={p.n} className={styles.ledgerRow}>
                <span className={styles.ledgerN}>{p.n}</span>
                <h2 className={styles.ledgerK}>{p.k}</h2>
                <p className={styles.ledgerV}>{p.v}</p>
              </article>
            ))}
          </section>
        </div>
      </PublicLayout>
    </>
  );
}
