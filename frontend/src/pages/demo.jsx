'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { appRoute } from '@/components/app/appRoutes';

const VALUE_POINTS = [
  'A live walkthrough on your real open roles',
  'See Autopilot screen, source and schedule end to end',
  'Pricing and rollout mapped to your team',
];

const LOGOS = ['Northwind', 'Lumen', 'Vertex', 'Corewave'];

const DAY_DEFS = [
  { dow: 'MON', num: '30' },
  { dow: 'TUE', num: '01' },
  { dow: 'WED', num: '02' },
  { dow: 'THU', num: '03' },
];

const SLOT_DEFS = ['9:00', '10:30', '12:00', '1:30', '3:00', '4:30'];

const inputStyle = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14.5,
  color: '#1B1A16',
  background: '#FBF8F1',
  border: '1px solid #E1D9C9',
  borderRadius: 11,
  padding: '12px 14px',
};

const labelStyle = {
  fontSize: 12.5,
  fontWeight: 600,
  color: '#46413A',
  marginBottom: 6,
  display: 'block',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  WebkitAppearance: 'none',
  appearance: 'none',
};

export default function BookDemo() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState(null);

  const slotLabel = (i) => SLOT_DEFS[i] + (i < 2 ? ' AM' : ' PM');

  const chosenLabel =
    slot !== null
      ? DAY_DEFS[day].dow.charAt(0) +
        DAY_DEFS[day].dow.slice(1).toLowerCase() +
        ' ' +
        DAY_DEFS[day].num +
        ', ' +
        slotLabel(slot)
      : '';

  return (
    <>
      <Head>
        <title>Book a demo — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #emkt * {
          box-sizing: border-box;
        }
        #emkt input::placeholder,
        #emkt textarea::placeholder {
          color: #a79e8f;
        }
        #emkt input:focus,
        #emkt textarea:focus,
        #emkt select:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div id="emkt" style={{ fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16', background: '#F7F3EA' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'block' }}>
          <SiteNav />
        </div>

        <div
          style={{
            maxWidth: 1140,
            margin: '0 auto',
            padding: '56px 32px 72px',
            display: 'grid',
            gridTemplateColumns: '1fr 1.05fr',
            gap: 56,
            alignItems: 'start',
          }}
        >
          {/* LEFT: VALUE RECAP */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #C7D2FB',
                background: '#EDF0FE',
                borderRadius: 999,
                padding: '6px 13px',
                marginBottom: 20,
              }}
            >
              <span style={{ color: '#1FA463' }}>✦</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#364FC7',
                }}
              >
                Book a demo
              </span>
            </div>
            <h1
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 48,
                lineHeight: 1.04,
                letterSpacing: '-0.01em',
                margin: '0 0 16px',
              }}
            >
              See your AI recruiter in action.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: '#5A544A', margin: '0 0 30px', maxWidth: 440 }}>
              A 30-minute walkthrough on your real reqs — see Autopilot screen, source and schedule live, then map it to your pipeline.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 34 }}>
              {VALUE_POINTS.map((v) => (
                <div key={v} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: '#EDF0FE',
                      color: '#4263EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, color: '#3A352C' }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 10.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
                marginBottom: 16,
              }}
            >
              Trusted by talent teams
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, flexWrap: 'wrap', opacity: 0.7, marginBottom: 34 }}>
              {LOGOS.map((l) => (
                <span key={l} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 800, fontSize: 19, color: '#8A8378' }}>
                  {l}
                </span>
              ))}
            </div>

            <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 22 }}>
              <p style={{ fontSize: 16, lineHeight: 1.45, color: '#1B1A16', margin: '0 0 16px', fontFamily: "'Instrument Serif',serif" }}>
                &quot;The demo used our own open roles. By the end of the call Autopilot had already shortlisted four people.&quot;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#4263EB',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  DW
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Dana Whitfield</div>
                  <div style={{ fontSize: 12.5, color: '#8A8378' }}>Senior Recruiter, Stripe</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: FORM / SUCCESS */}
          <div>
            {!submitted ? (
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 20,
                  padding: 32,
                  boxShadow: '0 30px 60px -40px rgba(27,26,22,0.35)',
                }}
              >
                <h2 style={{ fontSize: 21, fontWeight: 700, margin: '0 0 4px' }}>Request your demo</h2>
                <p style={{ fontSize: 13.5, color: '#8A8378', margin: '0 0 22px' }}>
                  Tell us a little about your team — we&rsquo;ll tailor the call.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dana Whitfield"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Work email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Company</label>
                      <input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Acme Inc."
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Company size</label>
                      <select style={selectStyle} defaultValue="1–50">
                        <option>1–50</option>
                        <option>51–200</option>
                        <option>201–1,000</option>
                        <option>1,000+</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Your role</label>
                      <input placeholder="Head of Talent" style={inputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Hiring volume / yr</label>
                      <select style={selectStyle} defaultValue="1–10 hires">
                        <option>1–10 hires</option>
                        <option>11–50 hires</option>
                        <option>51–200 hires</option>
                        <option>200+ hires</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>
                      What would you like to see?{' '}
                      <span style={{ color: '#A79E8F', fontWeight: 500 }}>(optional)</span>
                    </label>
                    <textarea
                      placeholder="We&rsquo;re hiring 12 designers this half and screening is the bottleneck…"
                      style={{
                        ...inputStyle,
                        minHeight: 80,
                        fontSize: 14,
                        lineHeight: 1.55,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setSubmitted(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    fontFamily: 'inherit',
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: '#fff',
                    background: '#4263EB',
                    border: 'none',
                    borderRadius: 999,
                    padding: 14,
                    cursor: 'pointer',
                    marginTop: 22,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#364FC7')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4263EB')}
                >
                  Request demo <span>→</span>
                </button>
                <p style={{ fontSize: 12, color: '#A79E8F', textAlign: 'center', margin: '13px 0 0' }}>
                  No spam. We&rsquo;ll only use this to schedule your call.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 20,
                  padding: 32,
                  boxShadow: '0 30px 60px -40px rgba(27,26,22,0.35)',
                  animation: 'rbpop 0.3s ease',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#EAF6EE',
                    color: '#157A49',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    marginBottom: 18,
                  }}
                >
                  ✓
                </div>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.08,
                    margin: '0 0 8px',
                  }}
                >
                  Request received.
                </h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5A544A', margin: '0 0 24px' }}>
                  We&rsquo;ll reach out within <b style={{ color: '#1B1A16' }}>1 business day</b> — or grab a slot now and skip the wait.
                </p>

                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9A9286',
                    marginBottom: 13,
                  }}
                >
                  Pick a time now
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {DAY_DEFS.map((d, i) => {
                    const on = day === i;
                    return (
                      <button
                        key={d.dow}
                        onClick={() => {
                          setDay(i);
                          setSlot(null);
                        }}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          background: on ? '#EDF0FE' : '#FBF8F1',
                          border: `1.5px solid ${on ? '#4263EB' : '#E1D9C9'}`,
                          borderRadius: 11,
                          padding: '11px 6px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ fontSize: 11, color: on ? '#4263EB' : '#A79E8F' }}>{d.dow}</div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 17,
                            fontWeight: 600,
                            color: on ? '#1B1A16' : '#5A544A',
                          }}
                        >
                          {d.num}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 22 }}>
                  {SLOT_DEFS.map((label, i) => {
                    const on = slot === i;
                    return (
                      <button
                        key={label}
                        onClick={() => setSlot(i)}
                        style={{
                          fontFamily: "'JetBrains Mono',monospace",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: on ? '#fff' : '#46413A',
                          background: on ? '#4263EB' : '#FBF8F1',
                          border: `1.5px solid ${on ? '#4263EB' : '#E1D9C9'}`,
                          borderRadius: 9,
                          padding: '10px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        {slotLabel(i)}
                      </button>
                    );
                  })}
                </div>

                {slot !== null && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      background: '#EDF0FE',
                      border: '1px solid #C7D2FB',
                      borderRadius: 12,
                      padding: '14px 16px',
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: '#4263EB',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ fontSize: 13.5, color: '#1F2D6B' }}>
                      Booked for <b>{chosenLabel}</b> · calendar invite on the way.
                    </span>
                  </div>
                )}

                <Link
                  href={appRoute('For Employers.dc.html')}
                  style={{ display: 'block', textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: '#4263EB', textDecoration: 'none' }}
                >
                  ← Back to For Employers
                </Link>
              </div>
            )}
          </div>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
