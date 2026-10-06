'use client';

import Head from 'next/head';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';

const HEADLINE = 'Make your experience easier to understand.';
const LEDE =
  'Compare your resume with a role, then create a clear, editable version from your experience.';

const PRINCIPLES = [
  {
    n: '01',
    k: 'Measured, not guessed',
    v: 'Comparison scores use consistent checks against your resume and job description.',
  },
  {
    n: '02',
    k: 'Defensible by default',
    v: 'A resume you cannot defend in a screen is worse than no resume.',
  },
  {
    n: '03',
    k: 'Speed without slop',
    v: 'Keep your versions together and refine the details before downloading.',
  },
];

export default function About() {
  return (
    <>
      <Head>
        <title>About Jobocate — Why we build for the screen</title>
        <meta
          name="description"
          content="Compare your resume with a role and create an editable version from your experience with Jobocate."
        />
        <link rel="canonical" href="https://jobocate.com/about" />
      </Head>

      <PublicLayout surface="v3">
        <div className={`jb ${styles.page} ${styles.pageNarrow}`}>
          <h1>{HEADLINE}</h1>
          <p className={styles.lede}>{LEDE}</p>

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
