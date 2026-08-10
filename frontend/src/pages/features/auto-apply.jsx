'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';

const CAP_DATA = [
  {
    tag: '01',
    title: 'Verified-page targeting',
    desc: 'We only apply on real employer ATS pages — Greenhouse, Lever, Workday, Ashby. Never scam listings or resale boards.',
    headline: 'Every application lands on a real career page',
    rows: [
      { k: 'GH', title: 'Greenhouse, Lever, Ashby', sub: 'Native ATS integrations' },
      { k: 'WD', title: 'Workday & Taleo', sub: 'Enterprise systems supported' },
      { k: 'XX', title: 'Zero aggregator spam', sub: 'Resale boards are filtered out' },
    ],
  },
  {
    tag: '02',
    title: 'Per-role tailoring',
    desc: 'Resume and cover letter are re-tailored for each posting using your real experience — not one generic blast sent everywhere.',
    headline: 'A tailored application for every role',
    rows: [
      { k: 'CV', title: 'Resume re-tuned per role', sub: 'Keywords matched to the JD' },
      { k: 'CL', title: 'Cover letter generated', sub: 'Specific to the team & mission' },
      { k: 'AI', title: 'Tone & seniority matched', sub: 'Reads like you wrote it' },
    ],
  },
  {
    tag: '03',
    title: 'Review & approve',
    desc: 'Approve in bulk, set rules, or hand it to full autopilot. You decide how much control to keep.',
    headline: 'As hands-on or hands-off as you want',
    rows: [
      { k: '✓', title: 'Bulk approve queue', sub: 'Clear a day in one click' },
      { k: '⚙', title: 'Rules & guardrails', sub: 'Salary, location, seniority filters' },
      { k: '↺', title: 'Pause or undo anytime', sub: 'Nothing is irreversible' },
    ],
  },
  {
    tag: '04',
    title: 'Full audit trail',
    desc: 'Every submission is logged with timestamp, version, and status — synced straight to your tracker.',
    headline: 'Know exactly what was sent, and when',
    rows: [
      { k: '🕑', title: 'Timestamped log', sub: 'Every action recorded' },
      { k: '#', title: 'Resume version saved', sub: 'See what each employer got' },
      { k: '↗', title: 'Synced to tracker', sub: 'Status updates in real time' },
    ],
  },
];

const QUEUE = [
  { tag: 'Me', role: 'Senior Product Designer', company: 'Meridian' },
  { tag: 'Ju', role: 'Product Manager, Growth', company: 'Juniper' },
  { tag: 'Co', role: 'Staff Frontend Engineer', company: 'Cobalt Labs' },
  { tag: 'As', role: 'Design Systems Lead', company: 'Aster Health' },
  { tag: 'Va', role: 'Senior Software Engineer', company: 'Vantage' },
];

const STATS = [
  { value: '100%', label: 'Applications land on verified career pages' },
  { value: '4', label: 'Major ATS platforms supported' },
  { value: 'Every', label: 'Application tailored to the role' },
  { value: '0', label: 'Scam boards or resale listings' },
];

const STEPS = [
  { n: '01', title: 'Set your targets', desc: 'Pick roles, seniority, locations, and salary floor. Add must-haves and dealbreakers once.' },
  { n: '02', title: 'We match & tailor', desc: 'Jobocate finds verified openings and re-tailors your resume and cover letter for each one.' },
  { n: '03', title: 'Approve or autopilot', desc: 'Review the queue and bulk-approve, or let autopilot submit within your guardrails.' },
];

const COMPARE = [
  { task: 'Find verified openings', manual: 'Hours of tab-juggling', jobocate: 'Surfaced automatically' },
  { task: 'Tailor each application', manual: 'Copy-paste & hope', jobocate: 'Re-tuned per role' },
  { task: 'Submit on career pages', manual: '20+ min each', jobocate: 'Filled & submitted for you' },
  { task: 'Track what was sent', manual: 'A messy spreadsheet', jobocate: 'Auto-logged & synced' },
  { task: 'Roles you reach', manual: 'A handful a day', jobocate: 'Every verified match' },
];

const TRUST = [
  { k: 'GDPR', title: 'GDPR compliant', sub: 'Export or delete anytime' },
  { k: 'ENC', title: 'Encrypted at rest', sub: 'Your data stays yours' },
  { k: 'LOG', title: 'Full audit log', sub: 'Every action recorded' },
  { k: 'OFF', title: 'One-click pause', sub: 'Stop the run instantly' },
];

const colorFor = (s) => (s === 'SENT' ? '#5BD08C' : s === 'SENDING' ? '#E8C15B' : '#8A8378');

export default function AutoApplyPage() {
  const [sent, setSent] = useState(0);
  const [cap, setCap] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1600);
      setSent(Math.round(8 * (1 - Math.pow(1 - t, 3))));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const activeCap = CAP_DATA[cap];
  const queue = QUEUE.map((item, i) => {
    const st = i < sent ? 'SENT' : i === sent ? 'SENDING' : 'QUEUED';
    return { ...item, status: st, color: colorFor(st) };
  });

  return (
    <>
      <Head>
        <title>Auto-Apply to Verified Jobs | Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbaa *,
        #jbaa *::before,
        #jbaa *::after {
          box-sizing: border-box;
        }
        #jbaa ::selection {
          background: var(--jb-d-accent);
          color: #f7f3ea;
        }
        html {
          scroll-behavior: smooth;
        }
        @keyframes riseIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulseRow {
          0% {
            background: var(--jb-d-accent-tint);
          }
          100% {
            background: var(--jb-d-panel);
          }
        }
      `}</style>

      <PublicLayout>

      <div id="jbaa" style={{ background: 'transparent', color: 'var(--jb-d-ink)', fontFamily: 'var(--jb-font-sans)' }}>
        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--jb-d-ink-55)' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: 'var(--jb-d-ink-55)', textDecoration: 'none' }}>HOME</Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: 'var(--jb-d-accent)' }}>AUTO-APPLY</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid var(--jb-d-line-btn)', borderRadius: 999, padding: '7px 14px', marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jb-d-accent)' }} />
                <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--jb-d-ink-70)' }}>Product — Auto-Apply</span>
              </div>
              <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(34px, 7vw, 74px)', lineHeight: 0.98, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                Auto-apply,<br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>on your terms.</span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', maxWidth: 470, margin: '0 0 32px' }}>
                Set your targets once. Jobocate applies to verified roles on real company career pages — tailored to each one, and never sent without your approval.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link href={appRoute('App Dashboard.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--jb-d-footer)', color: '#F7F3EA', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>
                  Start free <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--jb-d-ink)', fontSize: 16, fontWeight: 600, padding: '15px 22px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D2C9B7' }}>Book a demo</a>
              </div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: 'var(--jb-d-ink-65)' }}>
                ● Applies only to <b style={{ color: 'var(--jb-d-accent)' }}>verified</b> employer career pages — nothing sent without your go-ahead
              </div>
            </div>

            {/* AUTOMATION RUN VISUAL */}
            <div style={{ animation: 'riseIn 0.9s ease both' }}>
              <div style={{ background: 'var(--jb-d-footer)', borderRadius: 18, padding: 20, boxShadow: '0 30px 60px -28px rgba(27,26,22,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#5BD08C', boxShadow: '0 0 0 4px rgba(91,208,140,0.18)' }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#FBF8F1' }}>Auto-Apply run</span>
                  </div>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: 'var(--jb-d-accent)' }}>LIVE · {sent}/8 sent</span>
                </div>
                {queue.map((q) => (
                  <div key={q.tag} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: '#1F1D16', border: '1px solid #2C2A22', borderRadius: 11, marginBottom: 7 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#2C2A22', color: '#D7D0C4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{q.tag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F2EDE2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.role}</div>
                      <div style={{ fontSize: 11, color: 'var(--jb-d-ink-65)' }}>{q.company} · verified ATS</div>
                    </div>
                    <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, fontWeight: 600, color: q.color, flexShrink: 0 }}>{q.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: 'var(--jb-d-glass)', borderTop: '1px solid var(--jb-d-line-card)', borderBottom: '1px solid var(--jb-d-line-card)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '46px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ width: 32, height: 3, background: 'var(--jb-d-accent)', margin: '12px 0 10px' }} />
                <div style={{ fontSize: 14, color: 'var(--jb-d-ink-70)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— How it works</div>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>From setup to submitted in three moves</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 36 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ borderTop: '2px solid var(--jb-d-footer)', paddingTop: 22 }}>
                <div style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(28px, 6vw, 60px)', lineHeight: 1, color: 'var(--jb-d-accent)', marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--jb-d-ink-70)', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITIES (TABS) */}
        <section style={{ background: 'var(--jb-d-footer)', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 640, marginBottom: 44 }}>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— What&apos;s under the hood</div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0, color: '#FBF8F1' }}>Built to apply widely, never to spam</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 44, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CAP_DATA.map((c, i) => {
                  const on = cap === i;
                  return (
                    <button
                      key={c.tag}
                      onClick={() => setCap(i)}
                      style={{
                        textAlign: 'left',
                        background: on ? '#242219' : 'transparent',
                        border: `1px solid ${on ? '#3C5A47' : '#2C2A22'}`,
                        borderRadius: 14,
                        padding: 20,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: on ? '10px' : '0px' }}>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, color: on ? 'var(--jb-d-accent)' : '#6F695C' }}>{c.tag}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#FBF8F1' }}>{c.title}</span>
                      </div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--jb-d-ink-65)', margin: 0, maxHeight: on ? '80px' : '0px', overflow: 'hidden', transition: 'max-height 0.25s' }}>{c.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 18, padding: 30, minHeight: 360 }}>
                <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 8 }}>{activeCap.tag} · {activeCap.title}</div>
                <h3 style={{ fontFamily: 'var(--jb-font-display)', fontSize: 30, lineHeight: 1.1, color: '#FBF8F1', margin: '0 0 24px' }}>{activeCap.headline}</h3>
                {activeCap.rows.map((r) => (
                  <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: 'var(--jb-d-footer)', border: '1px solid #34322A', borderRadius: 12, marginBottom: 9 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: '#0E2A1B', color: 'var(--jb-d-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-font-mono)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{r.k}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F2EDE2' }}>{r.title}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--jb-d-ink-55)' }}>{r.sub}</div>
                    </div>
                    <span style={{ color: 'var(--jb-d-accent)', fontSize: 16 }}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— The difference</div>
            <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 48px)', lineHeight: 1.05, margin: 0 }}>Doing it by hand vs. doing it with Jobocate</h2>
          </div>
          <div style={{ border: '1px solid var(--jb-d-line-card)', borderRadius: 16, overflow: 'hidden', background: 'var(--jb-d-glass)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', background: 'var(--jb-d-glass)', borderBottom: '1px solid var(--jb-d-line-card)' }}>
              <div style={{ padding: '18px 22px', fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)' }}>Task</div>
              <div style={{ padding: '18px 22px', fontWeight: 700, fontSize: 14, color: 'var(--jb-d-ink-65)', borderLeft: '1px solid var(--jb-d-line-card)' }}>Manual</div>
              <div style={{ padding: '18px 22px', fontWeight: 700, fontSize: 14, color: 'var(--jb-d-accent)', borderLeft: '1px solid var(--jb-d-line-card)', background: 'var(--jb-d-accent-tint)' }}>With Jobocate</div>
            </div>
            {COMPARE.map((row) => (
              <div key={row.task} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', borderBottom: '1px solid var(--jb-d-line-card)' }}>
                <div style={{ padding: '17px 22px', fontSize: 14.5, fontWeight: 600 }}>{row.task}</div>
                <div style={{ padding: '17px 22px', fontSize: 14, color: 'var(--jb-d-ink-65)', borderLeft: '1px solid var(--jb-d-line-card)' }}>{row.manual}</div>
                <div style={{ padding: '17px 22px', fontSize: 14, color: 'var(--jb-d-ink)', fontWeight: 600, borderLeft: '1px solid var(--jb-d-line-card)', background: 'var(--jb-d-accent-tint)' }}>{row.jobocate}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECURITY BAND */}
        <section style={{ maxWidth: 1200, margin: '0 auto 88px', padding: '0 32px' }}>
          <div style={{ background: 'var(--jb-d-glass)', border: '1px solid var(--jb-d-line-card)', borderRadius: 22, padding: '52px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--jb-d-accent)', marginBottom: 16 }}>— You stay in control</div>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(26px, 5vw, 42px)', lineHeight: 1.05, margin: '0 0 16px' }}>Never a black box</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--jb-d-ink-85)', margin: 0 }}>Approve in bulk or hand the wheel to autopilot — either way, every submission is logged, reversible, and visible. We&apos;re GDPR-compliant and never touch scam boards or third-party aggregators.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 12 }}>
              {TRUST.map((t) => (
                <div key={t.k} style={{ background: 'var(--jb-d-glass)', border: '1px solid var(--jb-d-line-card)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 13, color: 'var(--jb-d-accent)', fontWeight: 600, marginBottom: 8 }}>{t.k}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--jb-d-ink-65)', lineHeight: 1.45 }}>{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '0 32px 88px', textAlign: 'center' }}>
          <div style={{ color: 'var(--jb-d-accent)', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>— OUR PROMISE</div>
          <p style={{ fontFamily: 'var(--jb-font-display)', fontSize: 'clamp(26px, 5vw, 38px)', lineHeight: 1.25, margin: '0 0 28px' }}>We only auto-apply to real, verified career pages — no resale boards, no aggregators. And nothing goes out until you approve it.</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#3A6F4E', color: 'var(--jb-d-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>JB</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Jobocate</div>
              <div style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)' }}>How auto-apply works, every time</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--jb-d-footer)', borderRadius: 24, padding: '78px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 'clamp(27px, 5vw, 58px)', lineHeight: 1.02, color: '#FBF8F1', margin: '0 auto 16px', maxWidth: 640 }}>Let the applications run themselves</h2>
              <p style={{ fontSize: 18, color: 'var(--jb-d-ink-65)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>Start free — set your targets in minutes and review your first batch of verified matches.</p>
              <Link href={appRoute('App Dashboard.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--jb-d-accent)', color: 'var(--jb-d-bg)', fontSize: 17, fontWeight: 700, padding: '17px 32px', borderRadius: 999, textDecoration: 'none' }}>
                Start free <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      </PublicLayout>
    </>
  );
}
