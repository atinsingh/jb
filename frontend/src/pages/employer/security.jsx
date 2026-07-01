'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import EmployerSidebar from '@/components/employer/EmployerSidebar';
import { appRoute } from '@/components/app/appRoutes';

/* ------------------------------------------------------------- sample data --- */
const IDPS = [
  { key: 'okta', name: 'Okta', logo: 'OK', logoBg: '#E6F0FE', logoColor: '#2A6FDB' },
  { key: 'azure', name: 'Azure AD', logo: 'AZ', logoBg: '#E6F0FE', logoColor: '#2A6FDB' },
  { key: 'google', name: 'Google', logo: 'G', logoBg: '#FBEDE9', logoColor: '#C9472E' },
];

const ROLE_COLS = [
  { label: 'Admin', color: '#4263EB' },
  { label: 'Recruiter', color: '#1B1A16' },
  { label: 'Hiring mgr', color: '#1B1A16' },
  { label: 'Interviewer', color: '#1B1A16' },
];

// capability rows: perms = [admin, recruiter, hiring manager, interviewer]
const CAPS = [
  { label: 'Post & edit jobs', perms: [true, true, false, false] },
  { label: 'View all candidates', perms: [true, true, 'team', false] },
  { label: 'Move pipeline stages', perms: [true, true, true, false] },
  { label: 'Submit scorecards', perms: [true, true, true, true] },
  { label: 'Send offers', perms: [true, false, false, false] },
  { label: 'Manage billing & members', perms: [true, false, false, false] },
  { label: 'Configure integrations', perms: [true, false, false, false] },
];

const cellFor = (v) => {
  if (v === true) return { mark: '✓', color: '#1FA463' };
  if (v === 'team') return { mark: 'Team', color: '#9A6A2E' };
  return { mark: '—', color: '#C9BFAC' };
};

const TIMEOUTS = [
  { key: '1h', label: '1h' },
  { key: '8h', label: '8h' },
  { key: '30d', label: '30d' },
];

/* ----------------------------------------------------------------- toggle --- */
function Toggle({ on, onClick, track, w = 46, h = 26, knob = 22 }) {
  return (
    <button onClick={onClick} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <span style={{ width: w, height: h, borderRadius: 999, background: track, position: 'relative', display: 'block', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? w - knob - 2 : 2, width: knob, height: knob, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
      </span>
    </button>
  );
}

const card = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24 };

/* ------------------------------------------------------------- component --- */
export default function EmployerSecurity() {
  const [idp, setIdp] = useState('okta');
  const [idpUrl, setIdpUrl] = useState('');
  const [enforce, setEnforce] = useState(false);
  const [scim, setScim] = useState(false);
  const [twofa, setTwofa] = useState(true);
  const [autoDelete, setAutoDelete] = useState(true);
  const [timeout, setTimeoutVal] = useState('8h');

  const ssoSub = enforce
    ? 'Enforced — members must sign in through your IdP.'
    : 'Configured but optional — members can still use password login.';
  const ssoBadge = enforce ? 'ENFORCED' : 'NOT ENFORCED';
  const ssoBadgeColor = enforce ? '#157A49' : '#9A6A2E';
  const ssoBadgeBg = enforce ? '#EAF6EE' : '#FBF1E2';
  const ssoBadgeBorder = enforce ? '#CDE9D6' : '#EAD9BE';
  const enforceBg = enforce ? '#EAF6EE' : '#FBF8F1';
  const enforceBorder = enforce ? '#CDE9D6' : '#E1D9C9';
  const enforceSub = enforce ? 'Password login is disabled for everyone.' : 'Turn on once your IdP test login succeeds.';

  const scimSub = scim ? 'Active — users and groups sync from your IdP.' : 'Auto-provision and deprovision members from your IdP.';

  return (
    <>
      <Head>
        <title>Security &amp; access — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #emapp ::-webkit-scrollbar {
          width: 8px;
        }
        #emapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #emapp input:focus,
        #emapp select:focus {
          outline: none;
          border-color: #4263eb;
          box-shadow: 0 0 0 3px rgba(66, 99, 235, 0.14);
        }
        @keyframes emrise {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div id="emapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <EmployerSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('Employer Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Org security</span>
          </header>

          <div style={{ padding: '28px 32px 64px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 36, lineHeight: 1, margin: '0 0 22px' }}>Security &amp; access</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* SSO */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                  <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: '#EDF0FE', color: '#4263EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⛨</span>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 3px' }}>Single sign-on (SAML)</h2>
                    <p style={{ fontSize: 13, color: '#8A8378', margin: 0 }}>{ssoSub}</p>
                  </div>
                  <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, fontWeight: 600, letterSpacing: '0.03em', color: ssoBadgeColor, background: ssoBadgeBg, border: `1px solid ${ssoBadgeBorder}`, padding: '4px 10px', borderRadius: 999 }}>{ssoBadge}</span>
                </div>

                <div style={{ display: 'flex', gap: 9, marginBottom: 18 }}>
                  {IDPS.map((p) => {
                    const on = idp === p.key;
                    return (
                      <button
                        key={p.key}
                        onClick={() => setIdp(p.key)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: on ? '#EDF0FE' : '#FFFEFB', border: `1.5px solid ${on ? '#4263EB' : '#E6DECF'}`, borderRadius: 12, padding: 14, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: p.logoBg, color: p.logoColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 11 }}>{p.logo}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1B1A16' }}>{p.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' }}>IdP metadata URL</label>
                    <input
                      value={idpUrl}
                      onChange={(e) => setIdpUrl(e.target.value)}
                      placeholder="https://idp.example.com/app/.../sso/saml/metadata"
                      style={{ width: '100%', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#1B1A16', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: '11px 13px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' }}>ACS URL (Jobocate)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: '10px 13px' }}>
                        <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#5A544A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>jobocate.com/sso/acs/stripe</span>
                        <button style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Copy</button>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' }}>Entity ID</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 11, padding: '10px 13px' }}>
                        <span style={{ flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#5A544A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>jobocate:sp:stripe</span>
                        <button style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Copy</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 18, padding: '14px 16px', background: enforceBg, border: `1px solid ${enforceBorder}`, borderRadius: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1B1A16' }}>Enforce SSO for all members</div>
                    <div style={{ fontSize: 12, color: '#8A8378' }}>{enforceSub}</div>
                  </div>
                  <Toggle on={enforce} onClick={() => setEnforce((v) => !v)} track={enforce ? '#4263EB' : '#D2C9B7'} />
                </div>
              </div>

              {/* SCIM */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 11, background: '#EDF0FE', color: '#4263EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⇲</span>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 3px' }}>SCIM provisioning</h2>
                    <p style={{ fontSize: 13, color: '#8A8378', margin: 0 }}>{scimSub}</p>
                  </div>
                  <Toggle on={scim} onClick={() => setScim((v) => !v)} track={scim ? '#4263EB' : '#D2C9B7'} />
                </div>
                {scim && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', animation: 'emrise 0.2s ease' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' }}>SCIM base URL</label>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#5A544A', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' }}>jobocate.com/scim/v2/stripe</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' }}>Bearer token</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#5A544A', background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 10, padding: '10px 12px' }}>
                        <span style={{ flex: 1 }}>scim_••••••••••••3f9a</span>
                        <button style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: '#4263EB', background: 'none', border: 'none', cursor: 'pointer' }}>Reveal</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ROLE MATRIX */}
              <div style={card}>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>Roles &amp; permissions</h2>
                <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 18px' }}>
                  What each role can do. <Link href={appRoute('Employer Team.dc.html')} style={{ color: '#4263EB', fontWeight: 600, textDecoration: 'none' }}>Manage members →</Link>
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 560 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)', gap: 8, padding: '0 0 12px', borderBottom: '1px solid #F2ECE0' }}>
                      <span />
                      {ROLE_COLS.map((rc) => (
                        <span key={rc.label} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: rc.color }}>{rc.label}</span>
                      ))}
                    </div>
                    {CAPS.map((cap, i) => (
                      <div key={cap.label} style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)', gap: 8, alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${i < CAPS.length - 1 ? '#F2ECE0' : 'transparent'}` }}>
                        <span style={{ fontSize: 13, color: '#3A352C' }}>{cap.label}</span>
                        {cap.perms.map((p, j) => {
                          const c = cellFor(p);
                          return (
                            <span key={j} style={{ textAlign: 'center', fontSize: 14, color: c.color }}>{c.mark}</span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SESSION + RETENTION */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ ...card, padding: 22 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Session policy</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>Idle timeout</span>
                      <div style={{ display: 'inline-flex', padding: 3, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 3 }}>
                        {TIMEOUTS.map((t) => {
                          const on = timeout === t.key;
                          return (
                            <button
                              key={t.key}
                              onClick={() => setTimeoutVal(t.key)}
                              style={{ fontSize: 11.5, fontWeight: 600, color: on ? '#1B1A16' : '#8A8378', background: on ? '#FFFEFB' : 'transparent', border: 'none', borderRadius: 999, padding: '5px 11px', cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(27,26,22,0.1)' : 'none', fontFamily: 'inherit' }}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>Require 2FA for all</span>
                      <Toggle on={twofa} onClick={() => setTwofa((v) => !v)} track={twofa ? '#4263EB' : '#D2C9B7'} w={42} h={24} knob={20} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>IP allowlist</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>Not set</span>
                    </div>
                  </div>
                </div>

                <div style={{ ...card, padding: 22 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Data retention</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>Rejected candidates</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 600, color: '#1B1A16' }}>2 years</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>Interview recordings</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 600, color: '#1B1A16' }}>90 days</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontSize: 13.5, color: '#3A352C' }}>Auto-delete on request</span>
                      <Toggle on={autoDelete} onClick={() => setAutoDelete((v) => !v)} track={autoDelete ? '#4263EB' : '#D2C9B7'} w={42} h={24} knob={20} />
                    </div>
                    <div style={{ fontSize: 11.5, color: '#A79E8F', lineHeight: 1.45 }}>Retention windows reflect EEOC and GDPR defaults. Contact your CSM to customize.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
