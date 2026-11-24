'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RESUME_INTENT_PATH, signupRedirectFor } from '@/lib/auth/routes';
import { getPlans } from '@/services/billingApi';
import styles from './HomeV3.module.css';

const FAQ = [
  ['Is the score free?', 'Yes. Create a free account, upload your resume, paste a job post and see your score and top issues. No card required.'],
  ['What does the score check?', 'How well your resume matches that specific job: the skills it asks for, document compatibility, and the writing patterns recruiters skim for.'],
  ['What file types work?', 'PDF and Word (DOCX).'],
  ['Can Jobocate write the resume for me?', 'Yes. It drafts a tailored resume from your experience and the role, and rewrites weak bullets. You review and edit everything before you download.'],
  ['Do I need a subscription?', 'No. The free plan includes a monthly credit allowance for scoring and creating. Pro adds more credits and priority job matching.'],
];

export default function HomeV3() {
  const { user } = useAuth();
  const [proPrice, setProPrice] = useState(null);
  // Signed-out visitors go to signup first, keeping the resume choice in ?redirect=.
  const href = (mode) => (user ? RESUME_INTENT_PATH[mode] : signupRedirectFor(RESUME_INTENT_PATH[mode]));

  useEffect(() => {
    let active = true;
    getPlans()
      .then((data) => {
        const plan = (data?.plans || []).find((p) => p.type === 'PRO');
        const amount = Number(plan?.priceMonthly);
        if (!plan || !Number.isFinite(amount) || !active) return;
        setProPrice(new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: String(plan.currency || 'usd').toUpperCase(),
          minimumFractionDigits: amount % 1 ? 2 : 0,
        }).format(amount));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className={styles.root}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Resume scoring + builder</p>
        <h1>Your resume gets 6 seconds.<br /><span>Make them count.</span></h1>
        <p className={styles.intro}>Upload your resume, paste the job you want, and get your ATS score with a free account. See exactly what’s missing, fix it line by line, and apply with a resume built for that role.</p>
        <div className={styles.actions}>
          <Link href={href('compare')} className={styles.primary}>Score my resume — free <span aria-hidden="true">↗</span></Link>
          <Link href={href('generate')} className={styles.secondary}>Build a new resume</Link>
        </div>
        <p className={styles.note}>Free account · No card required · PDF & Word resumes welcome</p>
      </section>
      <section id="demo" className={styles.demo} aria-labelledby="demo-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>How it works</p><h2 id="demo-heading">Three steps to your score.</h2></div>
          <p>One resume. One job description.<br />A score and the exact lines to fix.</p>
        </div>
        <div className={styles.videoFrame}>
          <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true">● ● ●</span><span>Jobocate / Resume comparison</span><span>Product walkthrough</span></div>
          <video autoPlay muted loop playsInline preload="metadata" poster="/demo/resume-comparison-poster.jpg?v=product-walkthrough-5" aria-label="Upload a resume, add a job description, and review scores with highlighted feedback">
            <source src="/demo/resume-comparison.webm?v=product-walkthrough-5" type="video/webm" />
            <track kind="captions" src="/demo/resume-comparison.vtt?v=product-walkthrough-5" srcLang="en" label="English" default />
            Your browser does not support video. Read the walkthrough below.
          </video>
        </div>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>Bring your resume</h3><p>Upload your PDF or Word resume.</p></div></li>
          <li><span>02</span><div><h3>Add the role</h3><p>Paste the job description you’re applying to.</p></div></li>
          <li><span>03</span><div><h3>See your score</h3><p>Get your ATS score, the skills you’re missing, and the exact lines to fix.</p></div></li>
        </ol>
      </section>
      <section id="generate-demo" className={styles.demo} aria-labelledby="generate-demo-heading">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Create</p><h2 id="generate-demo-heading">From profile to a resume.</h2></div>
          <p>Your experience. A template.<br />A document you can keep editing.</p>
        </div>
        <div className={styles.videoFrame}>
          <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true">● ● ●</span><span>Jobocate / Resume generation</span><span>Product walkthrough</span></div>
          <video autoPlay muted loop playsInline preload="metadata" poster="/demo/resume-generate-poster.jpg?v=product-walkthrough-2" aria-label="Choose a template, generate a resume, and review the ATS match">
            <source src="/demo/resume-generate.webm?v=product-walkthrough-2" type="video/webm" />
            <track kind="captions" src="/demo/resume-generate.vtt?v=product-walkthrough-2" srcLang="en" label="English" default />
            Your browser does not support video. Read the walkthrough below.
          </video>
        </div>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>Choose a template</h3><p>Pick a layout. Your content stays with it.</p></div></li>
          <li><span>02</span><div><h3>Add the role</h3><p>Name the job and paste the description.</p></div></li>
          <li><span>03</span><div><h3>Review the PDF</h3><p>Read the finished resume, then keep refining it.</p></div></li>
        </ol>
      </section>
      <section id="candidates" className={styles.features} aria-label="Candidate tools">
        <article><p className={styles.eyebrow}>Compare</p><h2>Know where you stand before you apply.</h2><p>Many resumes are filtered out before a person reads them. Jobocate checks yours against the actual job post — document compatibility, skill coverage, and the writing patterns recruiters skim for — and shows you what to change, line by line.</p><Link href={href('compare')}>Compare my resume — free <span aria-hidden="true">→</span></Link></article>
        <article><p className={styles.eyebrow}>Create</p><h2>Starting from scratch? Build it the same way.</h2><p>Pick a template, add the role you’re targeting, and Jobocate drafts a tailored resume from your experience. Edit every line, keep your versions together, and download a ready-to-send PDF.</p><Link href={href('generate')}>Build my resume <span aria-hidden="true">→</span></Link></article>
      </section>
      <section id="pricing-teaser" className={styles.teaser} aria-labelledby="pricing-teaser-heading">
        <p className={styles.eyebrow}>Pricing</p>
        <h2 id="pricing-teaser-heading">Free to start. Pay only when you want more.</h2>
        <p>{proPrice
          ? `Create a free account to score and compare your resume. Upgrade to Pro for more monthly credits and priority job matching — ${proPrice}/month, cancel anytime.`
          : 'Create a free account to score and compare your resume. Upgrade to Pro for more monthly credits and priority job matching.'}</p>
        <Link href="/pricing">See pricing <span aria-hidden="true">→</span></Link>
      </section>
      <section className={styles.faq} aria-labelledby="home-faq-heading">
        <h2 id="home-faq-heading">Questions</h2>
        {FAQ.map(([question, answer]) => (
          <div key={question} className={styles.faqRow}>
            <h3>{question}</h3>
            <p>{answer}</p>
          </div>
        ))}
      </section>
      <section className={styles.closing}>
        <h2>Your next application deserves a score first.</h2>
        <Link href={href('compare')} className={styles.primary}>Score my resume — free <span aria-hidden="true">↗</span></Link>
        <p>Free account. No card required.</p>
      </section>
    </div>
  );
}
