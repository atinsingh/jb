'use client';

import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const HERO_ACTIONS = [
  { icon: '⚖', iconBg: '#1E2D24', iconColor: '#5BD08C', title: 'Screened 37 applicants', sub: 'Senior Product Designer', stat: 'overnight' },
  { icon: '↑', iconBg: '#1E2D24', iconColor: '#5BD08C', title: 'Advanced Sarah Chen', sub: '96% match → Interview', stat: 'auto' },
  { icon: '◷', iconBg: '#1E2D24', iconColor: '#5BD08C', title: 'Scheduled 3 interviews', sub: 'From interviewer availability', stat: 'done' },
];

const LOGOS = ['Northwind', 'Lumen', 'Vertex', 'Corewave', 'Quanta', 'Brightside'];

const PROPS = [
  {
    kicker: 'Autopilot', glyph: '✦', tagBg: '#EAF6EE', tagColor: '#157A49',
    title: 'Screens and schedules while you sleep.', cols: '1fr 0.9fr', textOrder: 1, mockOrder: 2,
    body: 'Autopilot ranks every applicant against your rubric, advances strong matches, politely declines the rest, and books interviews from your team’s availability.',
    points: ['Auto-rank against your must-haves', 'Auto-advance ≥85%, decline below your floor', 'Every action waits for your one-tap approval'],
    mockBg: '#FBF9F4', mockBorder: '#EFE8DA', mockInk: '#1B1A16', mockMuted: '#8A8378',
    mockRows: [
      { initials: 'SC', name: 'Sarah Chen', sub: 'Advance → Interview', stat: '96%', avatarBg: '#1FA463', avatarColor: '#0C2C1C', statColor: '#157A49', divider: '#EFE8DA' },
      { initials: 'AB', name: 'Aisha Bello', sub: 'Advance → Screening', stat: '92%', avatarBg: '#4263EB', avatarColor: '#fff', statColor: '#157A49', divider: '#EFE8DA' },
      { initials: '8', name: '8 applicants', sub: 'Auto-decline < 50%', stat: '—', avatarBg: '#E8DCD3', avatarColor: '#9A6A2E', statColor: '#C9622E', divider: 'transparent' },
    ],
  },
  {
    kicker: 'Sourcing Agent', glyph: '✦', tagBg: '#EDF0FE', tagColor: '#4263EB',
    title: 'Finds the passive talent you’d never see.', cols: '0.9fr 1fr', textOrder: 2, mockOrder: 1,
    body: 'Describe the ideal hire and the agent works your talent pool and the wider network, ranking candidates by fit and drafting personalized outreach for each.',
    points: ['AI fit % from your real hiring signals', 'Editable, personalized outreach drafts', 'Tracks opens, replies and interest'],
    mockBg: '#FBF9F4', mockBorder: '#EFE8DA', mockInk: '#1B1A16', mockMuted: '#8A8378',
    mockRows: [
      { initials: 'DR', name: 'Diego Ramos', sub: 'Outreach drafted', stat: '89%', avatarBg: '#4263EB', avatarColor: '#fff', statColor: '#4263EB', divider: '#EFE8DA' },
      { initials: 'ML', name: 'Mei Lin', sub: 'Outreach sent · opened', stat: '87%', avatarBg: '#4263EB', avatarColor: '#fff', statColor: '#4263EB', divider: '#EFE8DA' },
      { initials: 'TK', name: 'Tomas Kovac', sub: 'Saved to shortlist', stat: '82%', avatarBg: '#4263EB', avatarColor: '#fff', statColor: '#8A8378', divider: 'transparent' },
    ],
  },
  {
    kicker: 'AI interviews', glyph: '✦', tagBg: '#EAF6EE', tagColor: '#157A49',
    title: 'Runs first rounds and writes the scorecards.', cols: '1fr 0.9fr', textOrder: 1, mockOrder: 2,
    body: 'Send an async AI screening interview, or drop in your notes — the AI returns a structured scorecard with competency ratings, risks to probe, and a hire recommendation.',
    points: ['Async AI screens, ranked transcripts', 'Structured scorecards your panel confirms', 'Consistent, bias-aware evaluation'],
    mockBg: '#FBF9F4', mockBorder: '#EFE8DA', mockInk: '#1B1A16', mockMuted: '#8A8378',
    mockRows: [
      { initials: 'SC', name: 'Sarah Chen', sub: 'Strong hire · 4.7 avg', stat: '✓', avatarBg: '#1FA463', avatarColor: '#0C2C1C', statColor: '#157A49', divider: '#EFE8DA' },
      { initials: 'JL', name: 'Jordan Lee', sub: 'Hire · 4.1 avg', stat: '✓', avatarBg: '#4263EB', avatarColor: '#fff', statColor: '#4263EB', divider: '#EFE8DA' },
      { initials: 'MO', name: 'Marcus Obi', sub: 'Needs review · 3.5', stat: '~', avatarBg: '#EDE7DA', avatarColor: '#5A544A', statColor: '#9A6A2E', divider: 'transparent' },
    ],
  },
];

const METRICS = [
  { value: '3×', label: 'faster time-to-hire', color: '#5BD08C' },
  { value: '−45%', label: 'cost per hire', color: '#FBF8F1' },
  { value: '37→6', label: 'applicants to shortlist', color: '#FBF8F1' },
  { value: '24d', label: 'avg days to offer', color: '#8DA2F5' },
];

export default function ForEmployers() {
  const signUp = appRoute('App Sign Up.dc.html');
  const bookDemo = appRoute('Book Demo.dc.html');
  const pricing = appRoute('Employer Pricing.dc.html');

  return (
    <>
      <Head>
        <title>Jobocate for Employers — Hire 3× faster with an AI recruiter</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        #emkt * {
          box-sizing: border-box;
        }
        #emkt ::selection {
          background: #1fa463;
          color: #f7f3ea;
        }
        @keyframes mkpulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>

      <div
        id="emkt"
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif",
          color: '#1B1A16',
          background: '#F7F3EA',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
          <SiteNav />
        </div>

        {/* HERO */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 32px 56px', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #C7D2FB', background: '#EDF0FE', borderRadius: 999, padding: '6px 13px', marginBottom: 22 }}>
              <span style={{ color: '#1FA463' }}>✦</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#364FC7' }}>For employers</span>
            </div>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 60, lineHeight: 1.02, letterSpacing: '-0.015em', margin: '0 0 20px' }}>Hire 3× faster with an AI recruiter that does the work.</h1>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: '#5A544A', margin: '0 0 30px', maxWidth: 520 }}>Jobocate screens every applicant, sources passive talent, runs first-round interviews, and schedules the rest — so your team only spends time on the people worth meeting.</p>
            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap' }}>
              <Link href={signUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#4263EB', color: '#fff', fontSize: 16, fontWeight: 700, padding: '15px 26px', borderRadius: 999, textDecoration: 'none' }}>Start hiring <span style={{ fontSize: 17 }}>→</span></Link>
              <Link href={bookDemo} style={{ display: 'inline-flex', alignItems: 'center', background: '#FFFEFB', color: '#1B1A16', fontSize: 16, fontWeight: 600, padding: '15px 26px', borderRadius: 999, textDecoration: 'none', border: '1px solid #D9D0BE' }}>Book a demo</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, fontSize: 13.5, color: '#8A8378' }}><span style={{ color: '#1FA463' }}>✓</span> Free to post your first role · No card required</div>
          </div>

          {/* HERO MOCK: Autopilot panel */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', border: '1px solid #2C2A22', borderRadius: 20, padding: 24, boxShadow: '0 40px 80px -40px rgba(27,26,22,0.5)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 8%, rgba(31,164,99,0.3), transparent 58%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ width: 40, height: 40, borderRadius: 11, background: '#1E2D24', color: '#5BD08C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, animation: 'mkpulse 2.4s ease-in-out infinite' }}>✦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#FBF8F1' }}>Autopilot is ON</div>
                  <div style={{ fontSize: 12, color: '#9A9286' }}>Working across 5 reqs</div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, color: '#0C2C1C', background: '#5BD08C', padding: '4px 9px', borderRadius: 999 }}>LIVE</span>
              </div>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {HERO_ACTIONS.map((a) => (
                  <div key={a.title} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#1E1C15', border: '1px solid #2C2A22', borderRadius: 12, padding: '13px 14px' }}>
                    <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: a.iconBg, color: a.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{a.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#FBF8F1' }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: '#8A8378' }}>{a.sub}</div>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#5BD08C' }}>{a.stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* LOGO STRIP */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 32px 56px' }}>
          <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 22 }}>Talent teams hiring on Jobocate</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap', opacity: 0.7 }}>
            {LOGOS.map((l) => (
              <span key={l} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 22, color: '#8A8378' }}>{l}</span>
            ))}
          </div>
        </section>

        {/* VALUE PROPS */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#364FC7', marginBottom: 14 }}>The agentic hiring stack</div>
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 42, lineHeight: 1.06, margin: '0 0 12px' }}>Your AI recruiter handles the busywork.</h2>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: '#5A544A', margin: 0 }}>Three agents work your pipeline around the clock — you stay in control of every decision.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {PROPS.map((p) => (
              <div key={p.kicker} style={{ display: 'grid', gridTemplateColumns: p.cols, gap: 40, alignItems: 'center', background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 22, padding: 36, overflow: 'hidden' }}>
                <div style={{ order: p.textOrder }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 9, background: p.tagBg, color: p.tagColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{p.glyph}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: p.tagColor }}>{p.kicker}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 30, lineHeight: 1.1, margin: '0 0 12px' }}>{p.title}</h3>
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: '#5A544A', margin: '0 0 18px' }}>{p.body}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {p.points.map((pt) => (
                      <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#3A352C' }}><span style={{ color: '#1FA463', flexShrink: 0 }}>✓</span>{pt}</div>
                    ))}
                  </div>
                </div>
                {/* MOCK */}
                <div style={{ order: p.mockOrder }}>
                  <div style={{ background: p.mockBg, border: `1px solid ${p.mockBorder}`, borderRadius: 16, padding: 18 }}>
                    {p.mockRows.map((m) => (
                      <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${m.divider}` }}>
                        <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', background: m.avatarBg, color: m.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{m.initials}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: p.mockInk }}>{m.name}</div>
                          <div style={{ fontSize: 11, color: p.mockMuted }}>{m.sub}</div>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: m.statColor }}>{m.stat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ROI BAND */}
        <section style={{ background: '#15140F', marginTop: 40 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5BD08C', marginBottom: 12 }}>The results</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1.06, color: '#FBF8F1', margin: 0 }}>Hiring teams move faster on Jobocate.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
              {METRICS.map((m) => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 46, fontWeight: 600, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 14, color: '#B8B1A4', marginTop: 8 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ maxWidth: 900, margin: '0 auto', padding: '72px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 30, color: '#1FA463', letterSpacing: '0.1em', marginBottom: 18 }}>★★★★★</div>
          <p style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 32, lineHeight: 1.3, color: '#1B1A16', margin: '0 0 26px' }}>&quot;Autopilot screens overnight and hands me a clean shortlist by morning. We cut time-to-hire from 38 days to 21 — with a smaller team.&quot;</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13 }}>
            <span style={{ width: 48, height: 48, borderRadius: '50%', background: '#4263EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>DW</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Dana Whitfield</div>
              <div style={{ fontSize: 13.5, color: '#8A8378' }}>Senior Recruiter, Stripe</div>
            </div>
          </div>
        </section>

        {/* PRICING TEASER */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 64px' }}>
          <div style={{ background: '#EDF0FE', border: '1px solid #C7D2FB', borderRadius: 24, padding: 48, display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#364FC7', marginBottom: 12 }}>Simple pricing</div>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.08, margin: '0 0 10px' }}>Plans that scale with your hiring.</h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.55, color: '#3F4A7A', margin: 0 }}>From your first hire to high-volume recruiting. Job slots, seats and AI actions included on every tier.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={pricing} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4263EB', color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px 24px', borderRadius: 999, textDecoration: 'none' }}>See pricing →</Link>
              <Link href={bookDemo} style={{ display: 'inline-flex', alignItems: 'center', background: '#FFFEFB', color: '#1B1A16', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 999, textDecoration: 'none', border: '1px solid #C7D2FB' }}>Talk to sales</Link>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: '#15140F', borderRadius: 28, padding: '72px 48px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(66,99,235,0.4), transparent 60%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 46, lineHeight: 1.04, color: '#FBF8F1', margin: '0 0 16px' }}>Put your hiring on autopilot.</h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: '#B8B1A4', margin: '0 auto 30px', maxWidth: 480 }}>Post your first role free and watch the AI recruiter go to work before your next coffee.</p>
              <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href={signUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#4263EB', color: '#fff', fontSize: 16, fontWeight: 700, padding: '15px 28px', borderRadius: 999, textDecoration: 'none' }}>Start hiring free <span>→</span></Link>
                <Link href={bookDemo} style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: '#FBF8F1', fontSize: 16, fontWeight: 600, padding: '15px 28px', borderRadius: 999, textDecoration: 'none', border: '1px solid #3A382E' }}>Book a demo</Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
