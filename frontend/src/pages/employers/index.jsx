'use client';

import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/site/v3/PublicV3.module.css';

/**
 * For Employers.
 *
 * The v3 bundle has employer *app* screens but no employer *marketing*
 * artboard, so this is assembled from the patterns v3 does define: the split
 * hero and hairline strips from the marketing home, and the mono row treatment
 * from the employer pipeline screens.
 *
 * COPY IS PRESERVED from the previous build, including its two deliberate
 * departures from the original mock, both of which came out of a brand audit:
 *
 * - No invented customer logo strip. The old build ran "Northwind, Lumen,
 *   Vertex, Corewave, Quanta, Brightside" under "Built for how modern talent
 *   teams hire". None of those companies exist.
 * - No unsourced outcome metrics ("3x faster time-to-hire", "-45% cost per
 *   hire"). The trust row states what the product does, which is verifiable.
 *
 * The arrivals panel shows initialled candidates, which is also how the real
 * pipeline surfaces them before shortlist.
 */

const POST_JOB = '/app/signup?as=employer';
const PRICING = '/employers/pricing';

const ARRIVALS = [
  { name: 'Candidate · A.R.', role: 'Sr Product Designer', score: '44', badge: 'Shortlisted' },
  { name: 'Candidate · M.K.', role: 'Product Designer', score: '41', badge: 'Screening' },
  { name: 'Candidate · J.T.', role: 'Design Lead', score: '42', badge: 'New' },
];

const TRUST = [
  'Ranked on job-related criteria',
  'Reasoning shown on every score',
  'Verified candidates only',
];

const FEATURES = [
  {
    who: 'Structured roles',
    claim: 'Post once, rank everything',
    body: 'Define the role’s real requirements once. Every applicant is scored against them, not against keyword noise.',
  },
  {
    who: 'Reasoned ranking',
    claim: 'Scores you can defend',
    body: 'Every rank opens to show why: job-related criteria in plain terms, ready for your hiring record.',
  },
  {
    who: 'Two-sided trust',
    claim: 'Verified people, both ways',
    body: 'Candidates arrive with verified experience; you arrive as a verified employer. No scam listings, no ghost applicants.',
  },
];

const STEPS = [
  {
    n: '01',
    k: 'Post a structured role',
    v: 'Requirements, must-haves and nice-to-haves. Ten minutes, guided.',
  },
  {
    n: '02',
    k: 'Receive ranked arrivals',
    v: 'Cleared candidates land in your board with the reasoning attached.',
  },
  {
    n: '03',
    k: 'Shortlist and meet',
    v: 'Move the top of the board straight to interviews, with no sorting stage.',
  },
];

export default function ForEmployers() {
  return (
    <>
      <Head>
        <title>AI Recruiter for Employers — Hiring Platform | Jobocate</title>
        <meta
          name="description"
          content="Post a structured role and Jobocate ranks candidates on job-related criteria, with the reasoning shown. From posting to shortlist without the sorting."
        />
        <link rel="canonical" href="https://jobocate.com/employers" />
      </Head>

      <PublicLayout variant="employer" surface="v3">
        <div className={`jb ${styles.page}`}>
          {/* Hero -------------------------------------------------------- */}
          <section className={styles.splitHero}>
            <div>
              <p className={`${styles.monoLabel} ${styles.accentText}`}>For employers</p>
              <h1>From posting to shortlist, without the sorting.</h1>
              <p className={styles.lede}>
                Post a structured role once. Every applicant is scored against it, and every score
                opens to show its reasoning.
              </p>
              <div className={styles.ctaRow}>
                <Link href={POST_JOB} className={`${styles.btn} ${styles.btnPrimary}`}>
                  Post a job
                </Link>
                <Link href={PRICING} className={`${styles.btn} ${styles.btnGhost}`}>
                  See pricing
                </Link>
              </div>
              <p className={styles.monoLabel}>First role free · No card required</p>
            </div>

            <div>
              <p className={styles.monoLabel}>Arrivals — Sr Product Designer</p>
              <ul className={styles.arrivals}>
                {ARRIVALS.map((a) => (
                  <li key={a.name} className={styles.arrivalRow}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{a.name}</span>
                      <span className={styles.rowSub}>{a.role}</span>
                    </span>
                    <span className={styles.arrivalBadge}>{a.badge}</span>
                    <span className={styles.rowMetaStrong}>{a.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Trust row --------------------------------------------------- */}
          <section className={styles.trustRow}>
            {TRUST.map((t) => (
              <span key={t} className={styles.monoLabel}>
                {t}
              </span>
            ))}
          </section>

          {/* What it does ------------------------------------------------ */}
          <section className={`${styles.strip} ${styles.strip3}`}>
            {FEATURES.map((f) => (
              <div key={f.who} className={styles.featureCell}>
                <p className={`${styles.monoLabel} ${styles.accentText}`}>{f.who}</p>
                <h2 className={styles.featureClaim}>{f.claim}</h2>
                <p className={styles.ledgerV}>{f.body}</p>
              </div>
            ))}
          </section>

          {/* How it runs ------------------------------------------------- */}
          <section className={styles.ledger} aria-label="How hiring runs">
            {STEPS.map((s) => (
              <article key={s.n} className={styles.ledgerRow}>
                <span className={styles.ledgerN}>{s.n}</span>
                <h2 className={styles.ledgerK}>{s.k}</h2>
                <p className={styles.ledgerV}>{s.v}</p>
              </article>
            ))}
          </section>

          {/* Close ------------------------------------------------------- */}
          <section className={styles.closing}>
            <h2 className={styles.closingH}>Start hiring.</h2>
            <Link href={POST_JOB} className={`${styles.btn} ${styles.btnPrimary}`}>
              Post a job
            </Link>
          </section>
        </div>
      </PublicLayout>
    </>
  );
}
