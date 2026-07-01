'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getUserPreferences, updateUserPreferences } from '@/services/api';
import {
  getUserProfile,
  updateUserProfile,
  getEntitlements,
} from '@/services/settingsApi';

/* ------------------------------------------------------ design sample data --- */
const TAB_DEFS = [
  { id: 'profile', label: 'Profile' },
  { id: 'prefs', label: 'Job preferences' },
  { id: 'notif', label: 'Notifications' },
  { id: 'billing', label: 'Plan & billing' },
];

const SAMPLE_PROFILE = {
  fullName: 'Sarah Chen',
  headline: 'Senior Product Designer',
  email: 'sarah.chen@gmail.com',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/sarahchen',
  initials: 'SC',
};

const SAMPLE_PREFS = [
  { label: 'Target roles', desc: 'Titles we match and apply to', value: 'Design · Product' },
  { label: 'Minimum salary', desc: 'Roles below this are hidden', value: '$170k+' },
  { label: 'Work arrangement', desc: 'Where you want to work', value: 'Remote · Hybrid' },
  { label: 'Seniority', desc: 'Level of roles to surface', value: 'Senior · Staff' },
];

const SAMPLE_BILLING = {
  planName: 'Pro · $29/mo',
  renews: 'Renews Jul 27, 2026 · unlimited auto-apply',
  cardBrand: 'VISA',
  cardLast4: '4242',
  cardExp: 'Expires 09/28',
};

const NOTIF_DEFS = [
  { key: 'matches', label: 'New match alerts', desc: 'When fresh roles above 90% appear.' },
  { key: 'interviews', label: 'Interview reminders', desc: 'A day before each scheduled interview.' },
  { key: 'weekly', label: 'Weekly summary', desc: 'Your applications and responses, every Monday.' },
  { key: 'product', label: 'Product updates', desc: 'Occasional news about new Jobocate features.' },
];

/* ----------------------------------------------------------------- helpers --- */
function initialsFrom(name) {
  if (!name) return 'SC';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SC';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || first.toUpperCase();
}

function fmtMoney(n) {
  if (n == null || n === '') return null;
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1000) return `$${Math.round(num / 1000)}k+`;
  return `$${num}+`;
}

function joinList(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(' · ');
  return v || null;
}

/* ----------------------------------------------------------------- screen --- */
export default function AppSettings() {
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [prefRows, setPrefRows] = useState(SAMPLE_PREFS);
  const [billing, setBilling] = useState(SAMPLE_BILLING);
  const [notif, setNotif] = useState({
    matches: true,
    interviews: true,
    weekly: false,
    product: false,
  });

  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // ------------------------------------------------------------- data load ---
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Profile (graceful fallback to design sample on any failure)
      try {
        const res = await getUserProfile();
        const u = res?.user || res || null;
        if (u && !cancelled) {
          setProfile((prev) => ({
            fullName: u.name || u.fullName || prev.fullName,
            headline: u.headline || u.title || prev.headline,
            email: u.email || prev.email,
            location: u.location || prev.location,
            linkedin: u.linkedin || u.linkedinUrl || prev.linkedin,
            initials: initialsFrom(u.name || u.fullName) || prev.initials,
          }));
        }
      } catch (e) {
        /* keep sample profile */
      }

      // Job preferences -> map onto the design's pref rows
      try {
        const res = await getUserPreferences();
        const p = res?.preferences || res || null;
        if (p && !cancelled) {
          const rows = [
            {
              label: 'Target roles',
              desc: 'Titles we match and apply to',
              value: joinList(p.jobTitles || p.targetRoles || p.roles) || SAMPLE_PREFS[0].value,
            },
            {
              label: 'Minimum salary',
              desc: 'Roles below this are hidden',
              value: fmtMoney(p.minSalary || p.salaryMin || p.minimumSalary) || SAMPLE_PREFS[1].value,
            },
            {
              label: 'Work arrangement',
              desc: 'Where you want to work',
              value:
                joinList(p.workArrangement || p.workArrangements || p.remotePreference) ||
                SAMPLE_PREFS[2].value,
            },
            {
              label: 'Seniority',
              desc: 'Level of roles to surface',
              value: joinList(p.seniority || p.seniorityLevels || p.experienceLevel) || SAMPLE_PREFS[3].value,
            },
          ];
          setPrefRows(rows);

          // Hydrate notification toggles if the backend stores them
          const np = p.notifications || p.notificationPreferences || null;
          if (np) {
            setNotif((prev) => ({
              matches: np.matches ?? np.matchAlerts ?? prev.matches,
              interviews: np.interviews ?? np.interviewReminders ?? prev.interviews,
              weekly: np.weekly ?? np.weeklySummary ?? prev.weekly,
              product: np.product ?? np.productUpdates ?? prev.product,
            }));
          }
        }
      } catch (e) {
        /* keep sample preferences */
      }

      // Plan & billing from entitlements
      try {
        const res = await getEntitlements();
        const planType = res?.planType;
        if (planType && !cancelled) {
          const PRICE = { FREE: '$0/mo', PRO: '$29/mo', ELITE: '$79/mo', INTERVIEW: '$19/mo' };
          const pretty = String(planType).charAt(0) + String(planType).slice(1).toLowerCase();
          setBilling((prev) => ({
            ...prev,
            planName: `${pretty}${PRICE[planType] ? ` · ${PRICE[planType]}` : ''}`,
          }));
        }
      } catch (e) {
        /* keep sample billing */
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------- mutations ---
  const markDirty = () => {
    setDirty(true);
    setSaved(false);
  };

  const onProfileChange = (key, val) => {
    setProfile((p) => ({ ...p, [key]: val }));
    markDirty();
  };

  const toggleNotif = (key) => {
    setNotif((s) => ({ ...s, [key]: !s[key] }));
    markDirty();
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    // Best-effort persistence. Never crash the screen on failure.
    try {
      await updateUserProfile({
        name: profile.fullName,
        headline: profile.headline,
        location: profile.location,
        linkedin: profile.linkedin,
      });
    } catch (e) {
      /* ignore — offline or not authenticated */
    }
    try {
      await updateUserPreferences({
        notifications: {
          matches: notif.matches,
          interviews: notif.interviews,
          weekly: notif.weekly,
          product: notif.product,
        },
      });
    } catch (e) {
      /* ignore */
    }
    setSaving(false);
    setSaved(true);
    setDirty(false);
  };

  // --------------------------------------------------------------- derived ---
  const activeLabel = useMemo(
    () => (TAB_DEFS.find((t) => t.id === tab) || {}).label,
    [tab]
  );
  const saveHint = saving ? 'Saving…' : saved ? '✓ Saved' : dirty ? 'Unsaved changes' : 'All changes saved';

  const profileFields = [
    { key: 'fullName', label: 'Full name', value: profile.fullName, span: 'span 1' },
    { key: 'headline', label: 'Headline', value: profile.headline, span: 'span 1' },
    { key: 'email', label: 'Email', value: profile.email, span: 'span 1' },
    { key: 'location', label: 'Location', value: profile.location, span: 'span 1' },
    { key: 'linkedin', label: 'LinkedIn', value: profile.linkedin, span: 'span 2' },
  ];

  return (
    <>
      <Head>
        <title>Settings — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus,
        #jbapp select:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
        }
        @keyframes jbshimmer {
          0% {
            background-position: -360px 0;
          }
          100% {
            background-position: 360px 0;
          }
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              Settings / {activeLabel}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#8A8378' }}>
              {saveHint}
            </span>
            <button
              onClick={save}
              disabled={saving}
              style={{
                fontFamily: 'inherit',
                fontSize: 13.5,
                fontWeight: 700,
                color: '#0C2C1C',
                background: '#1FA463',
                border: 'none',
                borderRadius: 999,
                padding: '9px 18px',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              Save changes
            </button>
          </header>

          <div style={{ padding: '30px 32px 48px', maxWidth: 1040, width: '100%' }}>
            <div style={{ marginBottom: 24 }}>
              <h1
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: 40,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                Settings
              </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 32, alignItems: 'start' }}>
              {/* TABS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'sticky', top: 90 }}>
                {TAB_DEFS.map((t) => {
                  const on = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontFamily: 'inherit',
                        fontSize: 14.5,
                        fontWeight: on ? 700 : 500,
                        color: on ? '#1B1A16' : '#5A544A',
                        background: on ? '#F1ECE0' : 'transparent',
                        border: 'none',
                        borderRadius: 10,
                        padding: '11px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: on ? '#1FA463' : 'transparent',
                        }}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* PANEL */}
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 18,
                  overflow: 'hidden',
                }}
              >
                {/* PROFILE */}
                {tab === 'profile' && (
                  <div style={{ padding: '28px 30px' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Profile</h2>
                    <p style={{ fontSize: 13.5, color: '#8A8378', margin: '0 0 24px' }}>
                      This information shapes your matches and tailored applications.
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        paddingBottom: 24,
                        marginBottom: 24,
                        borderBottom: '1px solid #F2ECE0',
                      }}
                    >
                      <span
                        style={{
                          width: 64,
                          height: 64,
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: '#1FA463',
                          color: '#0C2C1C',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 22,
                        }}
                      >
                        {profile.initials || initialsFrom(profile.fullName)}
                      </span>
                      <div>
                        <button
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#1B1A16',
                            background: '#FFFEFB',
                            border: '1px solid #D9D0BE',
                            borderRadius: 999,
                            padding: '8px 15px',
                            cursor: 'pointer',
                          }}
                        >
                          Upload photo
                        </button>
                        <div style={{ fontSize: 12, color: '#A79E8F', marginTop: 7 }}>
                          JPG or PNG, up to 4MB.
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} style={{ gridColumn: i === 4 ? 'span 2' : 'span 1' }}>
                            <div style={skel(90, 13, 7)} />
                            <div style={skel('100%', 42, 0)} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        {profileFields.map((f) => (
                          <div key={f.key} style={{ gridColumn: f.span }}>
                            <label
                              style={{
                                display: 'block',
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#46413A',
                                marginBottom: 7,
                              }}
                            >
                              {f.label}
                            </label>
                            <input
                              value={f.value || ''}
                              onChange={(e) => onProfileChange(f.key, e.target.value)}
                              style={{
                                width: '100%',
                                fontFamily: 'inherit',
                                fontSize: 14.5,
                                color: '#1B1A16',
                                background: '#FFFEFB',
                                border: '1px solid #D9D0BE',
                                borderRadius: 11,
                                padding: '11px 14px',
                                transition: 'box-shadow 0.15s, border-color 0.15s',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* JOB PREFERENCES */}
                {tab === 'prefs' && (
                  <div style={{ padding: '28px 30px' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Job preferences</h2>
                    <p style={{ fontSize: 13.5, color: '#8A8378', margin: '0 0 24px' }}>
                      We surface and auto-apply to roles that match these rules.
                    </p>
                    {(loading ? SAMPLE_PREFS : prefRows).map((p, i, arr) => (
                      <div
                        key={p.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 20,
                          padding: '16px 0',
                          borderBottom: i < arr.length - 1 ? '1px solid #F2ECE0' : 'none',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1B1A16', marginBottom: 3 }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: 13, color: '#8A8378' }}>{p.desc}</div>
                        </div>
                        {loading ? (
                          <span style={skel(96, 32, 0, 999)} />
                        ) : (
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: '#157A49',
                              background: '#EAF6EE',
                              borderRadius: 999,
                              padding: '8px 15px',
                            }}
                          >
                            {p.value}
                          </span>
                        )}
                      </div>
                    ))}
                    <Link
                      href={appRoute('App Auto-Apply.dc.html')}
                      style={{
                        display: 'inline-block',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#157A49',
                        textDecoration: 'none',
                        marginTop: 16,
                      }}
                    >
                      Edit preferences →
                    </Link>
                  </div>
                )}

                {/* NOTIFICATIONS */}
                {tab === 'notif' && (
                  <div style={{ padding: '28px 30px' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Notifications</h2>
                    <p style={{ fontSize: 13.5, color: '#8A8378', margin: '0 0 18px' }}>
                      Choose what reaches your inbox.
                    </p>
                    {NOTIF_DEFS.map((nDef, i) => {
                      const on = notif[nDef.key];
                      return (
                        <div
                          key={nDef.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 20,
                            padding: '16px 0',
                            borderBottom: i < NOTIF_DEFS.length - 1 ? '1px solid #F2ECE0' : 'none',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{ fontSize: 14.5, fontWeight: 600, color: '#1B1A16', marginBottom: 3 }}
                            >
                              {nDef.label}
                            </div>
                            <div style={{ fontSize: 13, color: '#8A8378' }}>{nDef.desc}</div>
                          </div>
                          <button
                            onClick={() => toggleNotif(nDef.key)}
                            aria-pressed={on}
                            style={{
                              flexShrink: 0,
                              position: 'relative',
                              width: 46,
                              height: 26,
                              borderRadius: 999,
                              border: 'none',
                              cursor: 'pointer',
                              background: on ? '#1FA463' : '#D2C9B7',
                              transition: 'background 0.2s',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: 3,
                                left: on ? 23 : 3,
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: '#FBF8F1',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                                transition: 'left 0.2s',
                              }}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BILLING */}
                {tab === 'billing' && (
                  <div style={{ padding: '28px 30px' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 24px' }}>Plan &amp; billing</h2>
                    <div
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: '#15140F',
                        borderRadius: 16,
                        padding: 24,
                        color: '#F2EDE2',
                        marginBottom: 22,
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background:
                            'radial-gradient(circle at 90% 0%, rgba(31,164,99,0.3), transparent 60%)',
                          pointerEvents: 'none',
                        }}
                      />
                      <div
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 20,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: 11,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                              color: '#5BD08C',
                              marginBottom: 8,
                            }}
                          >
                            Current plan
                          </div>
                          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 28, color: '#FBF8F1' }}>
                            {billing.planName}
                          </div>
                          <div style={{ fontSize: 13, color: '#9A9286', marginTop: 4 }}>{billing.renews}</div>
                        </div>
                        <Link
                          href={appRoute('App Offers.dc.html')}
                          style={{
                            background: '#1FA463',
                            color: '#0C2C1C',
                            fontSize: 14,
                            fontWeight: 700,
                            padding: '12px 20px',
                            borderRadius: 999,
                            textDecoration: 'none',
                          }}
                        >
                          Manage plan
                        </Link>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 18px',
                        border: '1px solid #E6DECF',
                        borderRadius: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                        <span
                          style={{
                            width: 40,
                            height: 28,
                            borderRadius: 6,
                            background: '#F1ECE0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#5A544A',
                          }}
                        >
                          {billing.cardBrand}
                        </span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>•••• •••• •••• {billing.cardLast4}</div>
                          <div style={{ fontSize: 12, color: '#8A8378' }}>{billing.cardExp}</div>
                        </div>
                      </div>
                      <button
                        style={{
                          fontFamily: 'inherit',
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#157A49',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Update
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ skeleton bit --- */
function skel(width, height, marginBottom = 0, radius = 8) {
  return {
    display: 'block',
    width: typeof width === 'number' ? `${width}px` : width,
    height: `${height}px`,
    marginBottom: `${marginBottom}px`,
    borderRadius: radius,
    background:
      'linear-gradient(90deg, #F2ECE0 25%, #E9E1D1 37%, #F2ECE0 63%)',
    backgroundSize: '720px 100%',
    animation: 'jbshimmer 1.2s infinite linear',
  };
}
