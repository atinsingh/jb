'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
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
    title: 'Per-role personalization',
    desc: 'Resume and cover letter are re-tailored for each posting using your real experience — not a single generic blast.',
    headline: 'A fresh, tailored application every single time',
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
  { tag: 'St', role: 'Senior Product Designer', company: 'Stripe' },
  { tag: 'Fi', role: 'Product Manager, Growth', company: 'Figma' },
  { tag: 'Li', role: 'Staff Frontend Engineer', company: 'Linear' },
  { tag: 'No', role: 'Design Systems Lead', company: 'Notion' },
  { tag: 'Ra', role: 'Senior Software Engineer', company: 'Ramp' },
];

const STATS = [
  { value: '100%', label: 'Verified employer pages' },
  { value: '6,000+', label: 'Applications sent daily' },
  { value: '12s', label: 'Avg. time per application' },
  { value: '0', label: 'Scam boards, ever' },
];

const STEPS = [
  { n: '01', title: 'Set your targets', desc: 'Pick roles, seniority, locations, and salary floor. Add must-haves and dealbreakers once.' },
  { n: '02', title: 'We match & tailor', desc: 'Jobocate finds verified openings and re-tailors your resume and cover letter for each one.' },
  { n: '03', title: 'Approve or autopilot', desc: 'Review the queue and bulk-approve, or let autopilot submit within your guardrails.' },
];

const COMPARE = [
  { task: 'Find verified openings', manual: 'Hours of tab-juggling', jobocate: 'Surfaced automatically' },
  { task: 'Tailor each application', manual: 'Copy-paste & hope', jobocate: 'Re-tuned per role' },
  { task: 'Submit on career pages', manual: '20+ min each', jobocate: '~12 seconds each' },
  { task: 'Track what was sent', manual: 'A messy spreadsheet', jobocate: 'Auto-logged & synced' },
  { task: 'Daily output', manual: '3–5 applications', jobocate: 'Dozens, on target' },
];

const TRUST = [
  { k: 'GDPR', title: 'GDPR compliant', sub: 'Export or delete anytime' },
  { k: 'SOC', title: 'Encrypted at rest', sub: 'Your data stays yours' },
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
        <title>Auto-Apply — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbaa *,
        #jbaa *::before,
        #jbaa *::after {
          box-sizing: border-box;
        }
        #jbaa ::selection {
          background: #1fa463;
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
            background: #eaf6ee;
          }
          100% {
            background: #fffefb;
          }
        }
      `}</style>

      <SiteNav />

      <div id="jbaa" style={{ background: '#F7F3EA', color: '#1B1A16', fontFamily: "'Hanken Grotesk',sans-serif" }}>
        {/* BREADCRUMB */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.08em', color: '#9A9286' }}>
            <Link href={appRoute('Jobocate Home.dc.html')} style={{ color: '#9A9286', textDecoration: 'none' }}>HOME</Link>
            &nbsp;/&nbsp; PRODUCT &nbsp;/&nbsp; <span style={{ color: '#157A49' }}>AUTO-APPLY</span>
          </div>
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 32px 56px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.02fr 0.98fr', gap: 56, alignItems: 'center' }}>
            <div style={{ animation: 'riseIn 0.7s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid #D9D0BE', borderRadius: 999, padding: '7px 14px', marginBottom: 24 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FA463' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5A544A' }}>Product — Auto-Apply</span>
              </div>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 74, lineHeight: 0.98, letterSpacing: '-0.01em', margin: '0 0 22px' }}>
                Applications that<br />
                <span style={{ background: 'linear-gradient(transparent 56%, rgba(31,164,99,0.32) 56%)', padding: '0 2px' }}>send themselves.</span>
              </h1>
              <p style={{ fontSize: 19, lineHeight: 1.55, color: '#4B463E', maxWidth: 470, margin: '0 0 32px' }}>
                Set your targets once. Jobocate applies to verified roles on real company career pages — personalized every time, and always under your control.
              </p>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Link href={appRoute('App Dashboard.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#1B1A16', color: '#F7F3EA', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>
                  Start free <span style={{ fontSize: 18 }}>→</span>
                </Link>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: '#1B1A16', fontSize: 16, fontWeight: 600, padding: '15px 22px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D2C9B7' }}>Book a demo</a>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>
                ● Trusted to send <b style={{ color: '#157A49' }}>6,000+</b> verified applications every day
              </div>
            </div>

            {/* AUTOMATION RUN VISUAL */}
            <div style={{ animation: 'riseIn 0.9s ease both' }}>
              <div style={{ background: '#15140F', borderRadius: 18, padding: 20, boxShadow: '0 30px 60px -28px rgba(27,26,22,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#5BD08C', boxShadow: '0 0 0 4px rgba(91,208,140,0.18)' }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#FBF8F1' }}>Auto-Apply run</span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#5BD08C' }}>LIVE · {sent}/8 sent</span>
                </div>
                {queue.map((q) => (
                  <div key={q.tag} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', background: '#1F1D16', border: '1px solid #2C2A22', borderRadius: 11, marginBottom: 7 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: '#2C2A22', color: '#D7D0C4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{q.tag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F2EDE2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.role}</div>
                      <div style={{ fontSize: 11, color: '#8A8378' }}>{q.company} · verified ATS</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: q.color, flexShrink: 0 }}>{q.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* STAT BAND */}
        <section style={{ background: '#F1ECE0', borderTop: '1px solid #E7E0D2', borderBottom: '1px solid #E7E0D2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '46px 32px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ width: 32, height: 3, background: '#1FA463', margin: '12px 0 10px' }} />
                <div style={{ fontSize: 14, color: '#5A544A' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ maxWidth: 600, marginBottom: 54 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— How it works</div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>From setup to submitted in three moves</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 36 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ borderTop: '2px solid #1B1A16', paddingTop: 22 }}>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 60, lineHeight: 1, color: '#1FA463', marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{s.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#5A544A', margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPABILITIES (TABS) */}
        <section style={{ background: '#1B1A16', color: '#F2EDE2' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 32px' }}>
            <div style={{ maxWidth: 640, marginBottom: 44 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 16 }}>— What&apos;s under the hood</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0, color: '#FBF8F1' }}>Built for volume without the spam</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 44, alignItems: 'start' }}>
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
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: on ? '#5BD08C' : '#6F695C' }}>{c.tag}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: '#FBF8F1' }}>{c.title}</span>
                      </div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#B8B1A4', margin: 0, maxHeight: on ? '80px' : '0px', overflow: 'hidden', transition: 'max-height 0.25s' }}>{c.desc}</p>
                    </button>
                  );
                })}
              </div>
              <div style={{ background: '#242219', border: '1px solid #34322A', borderRadius: 18, padding: 30, minHeight: 360 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 8 }}>{activeCap.tag} · {activeCap.title}</div>
                <h3 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 30, lineHeight: 1.1, color: '#FBF8F1', margin: '0 0 24px' }}>{activeCap.headline}</h3>
                {activeCap.rows.map((r) => (
                  <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: '#1B1A16', border: '1px solid #34322A', borderRadius: 12, marginBottom: 9 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: '#0E2A1B', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{r.k}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F2EDE2' }}>{r.title}</div>
                      <div style={{ fontSize: 12.5, color: '#9A9286' }}>{r.sub}</div>
                    </div>
                    <span style={{ color: '#5BD08C', fontSize: 16 }}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '88px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— The difference</div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 48, lineHeight: 1.05, margin: 0 }}>Doing it by hand vs. doing it with Jobocate</h2>
          </div>
          <div style={{ border: '1px solid #E1D9C9', borderRadius: 16, overflow: 'hidden', background: '#FBF8F1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', background: '#F1ECE0', borderBottom: '1px solid #E1D9C9' }}>
              <div style={{ padding: '18px 22px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' }}>Task</div>
              <div style={{ padding: '18px 22px', fontWeight: 700, fontSize: 14, color: '#8A8378', borderLeft: '1px solid #E1D9C9' }}>Manual</div>
              <div style={{ padding: '18px 22px', fontWeight: 700, fontSize: 14, color: '#157A49', borderLeft: '1px solid #E1D9C9', background: '#EAF6EE' }}>With Jobocate</div>
            </div>
            {COMPARE.map((row) => (
              <div key={row.task} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', borderBottom: '1px solid #EEE7D9' }}>
                <div style={{ padding: '17px 22px', fontSize: 14.5, fontWeight: 600 }}>{row.task}</div>
                <div style={{ padding: '17px 22px', fontSize: 14, color: '#8A8378', borderLeft: '1px solid #EEE7D9' }}>{row.manual}</div>
                <div style={{ padding: '17px 22px', fontSize: 14, color: '#1B1A16', fontWeight: 600, borderLeft: '1px solid #EEE7D9', background: '#F4FAF6' }}>{row.jobocate}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECURITY BAND */}
        <section style={{ maxWidth: 1200, margin: '0 auto 88px', padding: '0 32px' }}>
          <div style={{ background: '#F1ECE0', border: '1px solid #E1D9C9', borderRadius: 22, padding: '52px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 16 }}>— You stay in control</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 42, lineHeight: 1.05, margin: '0 0 16px' }}>Never a black box</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: '#4B463E', margin: 0 }}>Approve in bulk or hand the wheel to autopilot — either way, every submission is logged, reversible, and visible. We&apos;re GDPR-compliant and never touch scam boards or third-party aggregators.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {TRUST.map((t) => (
                <div key={t.k} style={{ background: '#FBF8F1', border: '1px solid #E6DECF', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#157A49', fontWeight: 600, marginBottom: 8 }}>{t.k}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: '#7A7367', lineHeight: 1.45 }}>{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 920, margin: '0 auto', padding: '0 32px 88px', textAlign: 'center' }}>
          <div style={{ color: '#1FA463', fontSize: 16, letterSpacing: '0.12em', marginBottom: 22 }}>★★★★★</div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontSize: 38, lineHeight: 1.25, margin: '0 0 28px' }}>&quot;Auto-apply to real, verified pages was the game changer. No sketchy boards — only opportunities, and I approved every one.&quot;</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 13 }}>
            <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#3A6F4E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>ER</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Emily Rodriguez</div>
              <div style={{ fontSize: 13.5, color: '#7A7367' }}>Data Scientist at Meta</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto 70px', padding: '0 32px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 24, padding: '78px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 130%, rgba(31,164,99,0.42), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 58, lineHeight: 1.02, color: '#FBF8F1', margin: '0 auto 16px', maxWidth: 640 }}>Let the applications run themselves</h2>
              <p style={{ fontSize: 18, color: '#B8B1A4', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.55 }}>Start free — set your targets in minutes and watch the first batch go out today.</p>
              <Link href={appRoute('App Dashboard.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#1FA463', color: '#0C2C1C', fontSize: 17, fontWeight: 700, padding: '17px 32px', borderRadius: 999, textDecoration: 'none' }}>
                Start free <span style={{ fontSize: 19 }}>→</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <SiteFooter />
    </>
  );
}
