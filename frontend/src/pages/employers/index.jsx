import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import styles from '@/components/home/v3/HomeV3.module.css';

const SIGNUP = '/app/signup?as=employer';

export default function ForEmployers() {
  return (
    <>
      <Head>
        <title>Hiring workspace for employers | Jobocate</title>
        <meta name="description" content="Define your role, review applicants and keep your hiring decisions together with Jobocate." />
        <link rel="canonical" href="https://jobocate.com/employers" />
      </Head>
      <PublicLayout variant="employer" surface="v3">
        <div className={styles.root}>
          <section className={styles.hero}>
            <p className={styles.eyebrow}>Built around your next hire</p>
            <h1>A clearer role.<br /><span>A stronger shortlist.</span></h1>
            <p className={styles.intro}>Bring your requirements, applicants and hiring decisions into one workspace. Focus on the people who fit the role.</p>
            <div className={styles.actions}>
              <Link href={SIGNUP} className={styles.primary}>Start hiring <span aria-hidden="true">↗</span></Link>
              <Link href="/employers/pricing" className={styles.secondary}>See employer plans</Link>
            </div>
          </section>
          <section className={styles.demo} aria-labelledby="hiring-workflow">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>A simpler hiring workflow</p><h2 id="hiring-workflow">From role to shortlist.</h2></div>
              <p>Keep the context together.<br />Make the next decision clearer.</p>
            </div>
            <ol className={styles.steps} style={{ padding: 28, border: '1px solid var(--jb-v3-line)', borderRadius: 14, background: 'var(--jb-v3-panel)' }}>
              <li><span>01</span><div><h3>Define the role</h3><p>Set the responsibilities, skills and experience you need.</p></div></li>
              <li><span>02</span><div><h3>Review applicants</h3><p>Read resumes and compare candidates with your requirements.</p></div></li>
              <li><span>03</span><div><h3>Build your shortlist</h3><p>Keep promising candidates and move the conversation forward.</p></div></li>
            </ol>
          </section>
          <section className={styles.features} aria-label="Hiring tools">
            <article><p className={styles.eyebrow}>Review</p><h2>See the experience behind the application.</h2><p>Keep resumes and role requirements together, with assessment details available when you need them.</p><Link href={SIGNUP}>Create your employer workspace →</Link></article>
            <article><p className={styles.eyebrow}>Organize</p><h2>Give every candidate a clear next step.</h2><p>Track applicants through your hiring pipeline and keep notes alongside the decisions they inform.</p><Link href="/employers/pricing">Explore employer plans →</Link></article>
          </section>
          <section className={styles.closing}><h2>Make room for your next hire.</h2><Link href={SIGNUP} className={styles.primary}>Start hiring <span aria-hidden="true">↗</span></Link></section>
        </div>
      </PublicLayout>
    </>
  );
}
