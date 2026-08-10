'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { appRoute } from '@/components/app/appRoutes';
import { API_URL } from '@/config/api';

const VALUE_POINTS = [
  'A walkthrough on your own open roles, not a canned demo',
  'Watch Autopilot source, screen and schedule end to end',
  'Pricing and rollout mapped to your team',
];


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
  color: 'var(--jb-d-ink)',
  background: 'var(--jb-d-glass)',
  border: '1px solid var(--jb-d-line-card)',
  borderRadius: 11,
  padding: '12px 14px',
};

const labelStyle = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--jb-d-ink-85)',
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
  const [companySize, setCompanySize] = useState('1–50');
  const [role, setRole] = useState('');
  const [hiringVolume, setHiringVolume] = useState('1–10 hires');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState(null);

  const submitDemoRequest = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError('Please add your name and work email.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          companySize,
          role: role.trim() || undefined,
          hiringVolume,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = Array.isArray(body.message) ? body.message[0] : body.message;
        throw new Error(detail || 'Request failed');
      }

      setSubmitted(true);
    } catch (err) {
      // Never show a success state we can't back up — a demo request that
      // silently vanishes is worse than one the visitor knows to retry.
      setError(
        err.message === 'Failed to fetch'
          ? "We couldn't reach our servers. Please retry, or email hello@jobocate.com."
          : err.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

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
        <title>Book a demo — Jobocate AI recruiter for hiring teams</title>
      </Head>

      <style jsx global>{`
        #emkt * {
          box-sizing: border-box;
        }
        #emkt input::placeholder,
        #emkt textarea::placeholder {
          color: var(--jb-d-ink-55);
        }
        #emkt input:focus,
        #emkt textarea:focus,
        #emkt select:focus {
          outline: none;
          border-color: #7cc4ff;
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

      <div id="emkt" style={{ fontFamily: 'var(--jb-font-sans)', color: 'var(--jb-d-ink)', background: 'transparent' }}>
        <PublicLayout>

        <div
          style={{
            maxWidth: 1140,
            margin: '0 auto',
            padding: '56px 32px 72px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
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
                border: '1px solid rgba(124,196,255,0.3)',
                background: 'rgba(124,196,255,0.12)',
                borderRadius: 999,
                padding: '6px 13px',
                marginBottom: 20,
              }}
            >
              <span style={{ color: 'var(--jb-d-accent)' }}>✦</span>
              <span
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#7cc4ff',
                }}
              >
                Book a demo
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--jb-font-display)',
                fontWeight: 400,
                fontSize: 'clamp(26px, 5vw, 48px)',
                lineHeight: 1.04,
                letterSpacing: '-0.01em',
                margin: '0 0 16px',
              }}
            >
              See our AI recruiter work your open roles.
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.55, color: 'var(--jb-d-ink-70)', margin: '0 0 30px', maxWidth: 440 }}>
              A 30-minute walkthrough on your own open roles — watch Autopilot source, screen and schedule candidates live, then map it to your pipeline.
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
                      background: 'rgba(124,196,255,0.12)',
                      color: '#7cc4ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--jb-d-ink-85)' }}>{v}</span>
                </div>
              ))}
            </div>

            {/*
              An invented logo strip (Northwind, Lumen, Vertex, Corewave) and a
              testimonial from "Dana Whitfield, Senior Recruiter, Stripe" sat
              here — Stripe is not a customer, and the same invented person was
              the form's own name placeholder directly to the right. Both are
              removed until there is a real, permissioned quote to run.
            */}

            <div style={{ background: 'var(--jb-d-panel)', border: '1px solid var(--jb-d-line-card)', borderRadius: 16, padding: 22 }}>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--jb-d-ink-55)', marginBottom: 12 }}>
                What to expect
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--jb-d-ink-85)', margin: 0 }}>
                We&rsquo;ll reply within one business day to book a time. The call runs
                on your own open roles — bring a live job description and we&rsquo;ll set
                Autopilot against it while you watch.
              </p>
            </div>
          </div>

          {/* RIGHT: FORM / SUCCESS */}
          <div>
            {!submitted ? (
              <div
                style={{
                  background: 'var(--jb-d-panel)',
                  border: '1px solid var(--jb-d-line-card)',
                  borderRadius: 20,
                  padding: 32,
                  boxShadow: '0 30px 60px -40px rgba(27,26,22,0.35)',
                }}
              >
                <h2 style={{ fontSize: 21, fontWeight: 700, margin: '0 0 4px' }}>Request your demo</h2>
                <p style={{ fontSize: 13.5, color: 'var(--jb-d-ink-65)', margin: '0 0 22px' }}>
                  Tell us a little about your team — we&rsquo;ll tailor the call.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
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
                      <select
                        style={selectStyle}
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                      >
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
                      <input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="Head of Talent"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Hiring volume / yr</label>
                      <select
                        style={selectStyle}
                        value={hiringVolume}
                        onChange={(e) => setHiringVolume(e.target.value)}
                      >
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
                      <span style={{ color: 'var(--jb-d-ink-55)', fontWeight: 500 }}>(optional)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
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

                {error && (
                  <p
                    role="alert"
                    style={{
                      margin: '18px 0 0',
                      padding: '10px 13px',
                      borderRadius: 10,
                      background: 'rgba(224,120,86,0.14)',
                      border: '1px solid rgba(224,120,86,0.4)',
                      color: 'var(--jb-d-danger)',
                      fontSize: 13.5,
                      lineHeight: 1.5,
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  onClick={submitDemoRequest}
                  disabled={sending}
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
                    background: sending ? '#8A9BF0' : '#7cc4ff',
                    border: 'none',
                    borderRadius: 999,
                    padding: 14,
                    cursor: sending ? 'not-allowed' : 'pointer',
                    marginTop: error ? 14 : 22,
                  }}
                  onMouseEnter={(e) => {
                    if (!sending) e.currentTarget.style.background= '#7cc4ff';
                  }}
                  onMouseLeave={(e) => {
                    if (!sending) e.currentTarget.style.background= '#7cc4ff';
                  }}
                >
                  {sending ? 'Sending…' : <>Request demo <span>→</span></>}
                </button>
                <p style={{ fontSize: 12, color: 'var(--jb-d-ink-55)', textAlign: 'center', margin: '13px 0 0' }}>
                  No spam. We&rsquo;ll only use this to schedule your call.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: 'var(--jb-d-panel)',
                  border: '1px solid var(--jb-d-line-card)',
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
                    background: 'var(--jb-d-accent-tint)',
                    color: 'var(--jb-d-accent)',
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
                    fontFamily: 'var(--jb-font-display)',
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.08,
                    margin: '0 0 8px',
                  }}
                >
                  Request received.
                </h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--jb-d-ink-70)', margin: '0 0 24px' }}>
                  We&rsquo;ll reach out within <b style={{ color: 'var(--jb-d-ink)' }}>1 business day</b> — or grab a slot now and skip the wait.
                </p>

                <div
                  style={{
                    fontFamily: 'var(--jb-font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--jb-d-ink-55)',
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
                          background: on ? 'rgba(124,196,255,0.12)' : 'var(--jb-d-glass)',
                          border: `1.5px solid ${on ? '#4263EB' : '#E1D9C9'}`,
                          borderRadius: 11,
                          padding: '11px 6px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ fontSize: 11, color: on ? '#7cc4ff' : 'var(--jb-d-ink-55)' }}>{d.dow}</div>
                        <div
                          style={{
                            fontFamily: 'var(--jb-font-mono)',
                            fontSize: 17,
                            fontWeight: 600,
                            color: on ? 'var(--jb-d-ink)' : 'var(--jb-d-ink-70)',
                          }}
                        >
                          {d.num}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 8, marginBottom: 22 }}>
                  {SLOT_DEFS.map((label, i) => {
                    const on = slot === i;
                    return (
                      <button
                        key={label}
                        onClick={() => setSlot(i)}
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: on ? '#fff' : 'var(--jb-d-ink-85)',
                          background: on ? '#7cc4ff' : 'var(--jb-d-glass)',
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
                      background: 'rgba(124,196,255,0.12)',
                      border: '1px solid rgba(124,196,255,0.3)',
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
                        background: '#7cc4ff',
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
                  style={{ display: 'block', textAlign: 'center', fontSize: 13.5, fontWeight: 600, color: '#7cc4ff', textDecoration: 'none' }}
                >
                  ← Back to For Employers
                </Link>
              </div>
            )}
          </div>
        </div>

        </PublicLayout>
      </div>
    </>
  );
}
