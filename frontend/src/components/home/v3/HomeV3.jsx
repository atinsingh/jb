'use client';

import Link from 'next/link';
import styles from './HomeV3.module.css';

export default function HomeV3() {
  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Built around your next role</p>
        <h1>A better resume.<br /><span>A clearer next step.</span></h1>
        <p className={styles.intro}>Turn your experience into a resume that fits the role.<br className={styles.desktopBreak} /> Compare what you have. Create what comes next.</p>
        <div className={styles.actions}>
          <Link href="/app/resume?mode=generate" className={styles.primary}>Create my resume <span aria-hidden="true">↗</span></Link>
          <Link href="/app/resume?mode=compare" className={styles.secondary}>Compare my resume</Link>
        </div>
        <p className={styles.note}>Your experience. Your words. Your next opportunity.</p>
      </section>
      <section id="demo" className={styles.demo} aria-labelledby="demo-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>See it in action</p><h2 id="demo-heading">From resume to a plan.</h2></div>
          <p>One document. One job description.<br />Clear scores and useful next steps.</p>
        </div>
        <div className={styles.videoFrame}>
          <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true">● ● ●</span><span>Jobocate / Resume comparison</span><span>Product walkthrough</span></div>
          <video autoPlay muted loop playsInline preload="metadata" poster="/demo/resume-comparison-poster.jpg?v=google-walkthrough" aria-label="Google sign-in, resume comparison and highlighted PDF feedback using Harkit Singh Chhabra’s resume">
            <source src="/demo/resume-comparison.webm?v=google-walkthrough" type="video/webm" />
            <track kind="captions" src="/demo/resume-comparison.vtt?v=google-walkthrough" srcLang="en" label="English" default />
            Your browser does not support video. Read the walkthrough below.
          </video>
        </div>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>Bring your resume</h3><p>Upload your existing PDF or DOCX.</p></div></li>
          <li><span>02</span><div><h3>Add the role</h3><p>Paste a job description or posting link.</p></div></li>
          <li><span>03</span><div><h3>Find your next edit</h3><p>Review scores, missing skills and highlighted feedback.</p></div></li>
        </ol>
      </section>
      <section id="candidates" className={styles.features} aria-label="Candidate tools">
        <article><p className={styles.eyebrow}>Compare</p><h2>Know where you stand.</h2><p>Check document compatibility, see which job skills your resume covers, and find writing patterns worth refining.</p><Link href="/app/resume?mode=compare">Compare a resume <span aria-hidden="true">→</span></Link></article>
        <article><p className={styles.eyebrow}>Create</p><h2>Make your experience count.</h2><p>Start with your profile, choose a clean template, and refine the result. Save your versions and download a ready-to-send PDF.</p><Link href="/app/resume?mode=generate">Create a resume <span aria-hidden="true">→</span></Link></article>
      </section>
      <section className={styles.closing}><h2>Your next chapter starts here.</h2><Link href="/app/resume?mode=generate" className={styles.primary}>Create my resume <span aria-hidden="true">↗</span></Link><p>Already have one? <Link href="/app/resume?mode=compare">See how it fits a role.</Link></p></section>
    </div>
  );
}
