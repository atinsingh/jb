'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

const STEP_TITLES = ['Company', 'Team', 'First job'];

const HEADS = [
  { h: 'Tell us about your company', s: 'This appears on your jobs and careers page.' },
  { h: 'Add your team', s: "Invite the people who'll hire alongside you." },
  { h: 'Post your first role', s: 'Or skip — you can post anytime from the dashboard.' },
];

const ROLE_OPTS = [
  { key: 'recruiter', label: 'Recruiter' },
  { key: 'hm', label: 'Hiring manager' },
  { key: 'admin', label: 'Admin / Ops' },
  { key: 'founder', label: 'Founder' },
];

const BRAND_LABELS = ['Company profile', 'Invite your team', 'Post your first role'];

export default function EmployerOnboarding() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState('Stripe');
  const [website, setWebsite] = useState('stripe.com');
  const [hq, setHq] = useState('San Francisco, CA');
  const [role, setRole] = useState('recruiter');
  const [invites, setInvites] = useState(['raj@stripe.com']);
  const [inviteDraft, setInviteDraft] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const isCompany = step === 0;
  const isTeam = step === 1;
  const isJob = step === 2;
  const canBack = step > 0;
  const notLast = step < 2;
  const isLast = step === 2;

  const progress = `${((step + 1) / 3) * 100}%`;
  const stepLabel = `Step ${step + 1} of 3`;

  const next = () => setStep((s) => Math.min(s + 1, 2));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const addInvite = () => {
    const v = inviteDraft.trim();
    if (!v) return;
    setInvites((prev) => prev.concat(v));
    setInviteDraft('');
  };
  const removeInvite = (idx) => setInvites((prev) => prev.filter((_, j) => j !== idx));
  const onInviteKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInvite();
    }
  };

  const labelStyle = { fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' };
  const inputStyle = {
    width: '100%',
    fontFamily: 'inherit',
    fontSize: 15,
    color: '#1B1A16',
    background: '#FFFEFB',
    border: '1px solid #D9D0BE',
    borderRadius: 12,
    padding: '12px 14px',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' };

  return (
    <>
      <Head>
        <title>Set up your hiring — Jobocate for Employers</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #emob * {
          box-sizing: border-box;
        }
        #emob input::placeholder {
          color: #a79e8f;
        }
        #emob input:focus,
        #emob select:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.15);
        }
        @keyframes riseIn {
          from {
            transform: translateY(16px);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.97);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div
        id="emob"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        {/* WIZARD SIDE */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '34px 56px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontSize: 23,
                color: '#1B1A16',
              }}
            >
              Jobocate<span style={{ color: '#1FA463' }}>.</span>
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: '#364FC7',
                background: '#EDF0FE',
                border: '1px solid #C7D2FB',
                padding: '2px 7px',
                borderRadius: 5,
              }}
            >
              RECRUITER
            </span>
            <div style={{ flex: 1, height: 3, borderRadius: 999, background: '#E6DECF', overflow: 'hidden' }}>
              <div style={{ width: progress, height: '100%', background: '#4263EB', transition: 'width 0.35s ease' }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#9A9286' }}>{stepLabel}</span>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              maxWidth: 480,
              width: '100%',
              margin: '0 auto',
              animation: 'riseIn 0.5s ease both',
            }}
          >
            {/* STEPPER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 26 }}>
              {STEP_TITLES.map((t, i) => {
                const done = i < step;
                const cur = i === step;
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: cur || done ? '#fff' : '#9A9286',
                        background: cur || done ? '#4263EB' : '#FFFEFB',
                        border: `1.5px solid ${cur || done ? '#4263EB' : '#D2C9B7'}`,
                      }}
                    >
                      {done ? '✓' : String(i + 1)}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: cur || done ? '#1B1A16' : '#9A9286' }}>{t}</span>
                    {i < STEP_TITLES.length - 1 && (
                      <span style={{ width: 30, height: 1.5, background: '#D2C9B7', margin: '0 12px' }} />
                    )}
                  </div>
                );
              })}
            </div>

            <h1
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: 38,
                lineHeight: 1.04,
                letterSpacing: '-0.01em',
                margin: '0 0 6px',
              }}
            >
              {HEADS[step].h}
            </h1>
            <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 26px' }}>{HEADS[step].s}</p>

            {/* STEP 1: COMPANY */}
            {isCompany && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'rbpop 0.25s ease' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                  <div style={{ flexShrink: 0 }}>
                    <label style={labelStyle}>Logo</label>
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 14,
                        background: '#EDF0FE',
                        color: '#4263EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 20,
                        fontFamily: "'JetBrains Mono',monospace",
                        border: '1px dashed #C7D2FB',
                        cursor: 'pointer',
                      }}
                    >
                      St
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Company name</label>
                    <input value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Website</label>
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Industry</label>
                    <select style={selectStyle} defaultValue="Financial infrastructure">
                      <option>Financial infrastructure</option>
                      <option>SaaS</option>
                      <option>Marketplace</option>
                      <option>Healthcare</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Company size</label>
                    <select style={selectStyle} defaultValue="1,000+">
                      <option>1–50</option>
                      <option>51–200</option>
                      <option>201–1,000</option>
                      <option>1,000+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Headquarters</label>
                  <input value={hq} onChange={(e) => setHq(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            {/* STEP 2: TEAM */}
            {isTeam && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'rbpop 0.25s ease' }}>
                <div>
                  <label style={labelStyle}>Your role</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ROLE_OPTS.map((r) => {
                      const on = role === r.key;
                      return (
                        <button
                          key={r.key}
                          onClick={() => setRole(r.key)}
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: on ? '#fff' : '#46413A',
                            background: on ? '#4263EB' : '#FFFEFB',
                            border: `1px solid ${on ? '#4263EB' : '#D9D0BE'}`,
                            borderRadius: 999,
                            padding: '9px 16px',
                            cursor: 'pointer',
                          }}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    Invite your team <span style={{ color: '#A79E8F', fontWeight: 500 }}>— optional</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {invites.map((email, i) => (
                      <span
                        key={`${email}-${i}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#1F2D6B',
                          background: '#EDF0FE',
                          border: '1px solid #C7D2FB',
                          borderRadius: 999,
                          padding: '7px 8px 7px 13px',
                        }}
                      >
                        {email}
                        <button
                          onClick={() => removeInvite(i)}
                          style={{
                            width: 18,
                            height: 18,
                            border: 'none',
                            background: '#C7D2FB',
                            color: '#364FC7',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: 10,
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <input
                      value={inviteDraft}
                      onChange={(e) => setInviteDraft(e.target.value)}
                      onKeyDown={onInviteKey}
                      placeholder="+ teammate@company.com"
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 13,
                        color: '#1B1A16',
                        background: '#FBF8F1',
                        border: '1px dashed #C7D2FB',
                        borderRadius: 999,
                        padding: '7px 14px',
                        width: 220,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: FIRST JOB */}
            {isJob && (
              <div style={{ animation: 'rbpop 0.25s ease' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: '#FFFEFB',
                    border: '1px solid #E6DECF',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 11,
                      background: '#EDF0FE',
                      color: '#4263EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    ＋
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Post your first job</div>
                    <div style={{ fontSize: 13, color: '#8A8378' }}>Autopilot starts screening the moment it&apos;s live.</div>
                  </div>
                </div>
                <label style={labelStyle}>Job title</label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Product Designer"
                  style={inputStyle}
                />
              </div>
            )}

            {/* NAV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
              {canBack && (
                <button
                  onClick={back}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: '#1B1A16',
                    background: '#FFFEFB',
                    border: '1px solid #D9D0BE',
                    borderRadius: 999,
                    padding: '13px 22px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
              )}
              <div style={{ flex: 1 }} />
              {notLast && (
                <button
                  onClick={next}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    fontFamily: 'inherit',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#fff',
                    background: '#4263EB',
                    border: 'none',
                    borderRadius: 999,
                    padding: '14px 26px',
                    cursor: 'pointer',
                  }}
                >
                  Continue <span>→</span>
                </button>
              )}
              {isLast && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link
                    href={appRoute('Employer Dashboard.dc.html')}
                    style={{ fontSize: 14, fontWeight: 600, color: '#8A8378', textDecoration: 'none' }}
                  >
                    Skip for now
                  </Link>
                  <Link
                    href={appRoute('Employer Dashboard.dc.html')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 9,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#fff',
                      background: '#4263EB',
                      borderRadius: 999,
                      padding: '14px 26px',
                      textDecoration: 'none',
                    }}
                  >
                    Post your first job <span>→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A79E8F' }}>© 2026 Jobocate</div>
        </div>

        {/* BRAND SIDE */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: '#15140F',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 85% 8%, rgba(66,99,235,0.34), transparent 55%), radial-gradient(circle at 5% 100%, rgba(31,164,99,0.16), transparent 50%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#8DA2F5',
            }}
          >
            — Setting up your hiring
          </div>

          <div style={{ position: 'relative' }}>
            <p
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontSize: 38,
                lineHeight: 1.08,
                color: '#F2EDE2',
                margin: '0 0 30px',
                maxWidth: 430,
              }}
            >
              Hire 3× faster with AI-screened applicants.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 34 }}>
              {BRAND_LABELS.map((label, i) => {
                const done = i < step;
                const cur = i === step;
                return (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '15px 17px',
                      background: cur ? '#1E2436' : '#1A1813',
                      border: `1px solid ${cur ? '#2F3C5C' : '#2C2A22'}`,
                      borderRadius: 13,
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: done || cur ? '#4263EB' : '#15140F',
                        border: `1.5px solid ${done || cur ? '#4263EB' : '#3A382E'}`,
                        color: done || cur ? '#fff' : '#6B6456',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: "'JetBrains Mono',monospace",
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {done ? '✓' : String(i + 1)}
                    </span>
                    <span
                      style={{
                        fontSize: 14.5,
                        fontWeight: cur ? 700 : 500,
                        color: cur ? '#FBF8F1' : done ? '#C7D2FB' : '#8A8378',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 30, fontWeight: 600, color: '#8DA2F5' }}>
                37→6
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.4, color: '#9A9286', maxWidth: 250 }}>
                Autopilot turns a flood of applicants into a clean shortlist by morning.
              </span>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#9A9286' }}>
            <span style={{ color: '#1FA463', letterSpacing: '0.1em' }}>★★★★★</span>
            Trusted by 5,000+ hiring teams
          </div>
        </div>
      </div>
    </>
  );
}
