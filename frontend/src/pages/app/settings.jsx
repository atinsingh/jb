'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getUserPreferences, updateUserPreferences } from '@/services/api';
import {
  getUserProfile,
  updateUserProfile,
  getEntitlements,
  uploadProfilePicture,
} from '@/services/settingsApi';
import { preferenceSummaryRows } from '@/lib/preferenceSummary';
import { EmptyState, InlineError } from '@/components/app/AppStates';

/* --------------------------------------------------- static UI scaffolds ---- */
// `saves` marks the tabs the header's Save button actually writes. The other
// two are read-only, so the button is hidden there rather than sitting live
// above content it cannot affect.
const TAB_DEFS = [
  { id: 'profile', label: 'Profile', saves: true },
  { id: 'prefs', label: 'Job preferences', saves: false },
  { id: 'notif', label: 'Notifications', saves: true },
  { id: 'billing', label: 'Plan & billing', saves: false },
];

const NOTIF_DEFS = [
  { key: 'matches', label: 'New match alerts', desc: 'When fresh roles above 90% appear.' },
  { key: 'interviews', label: 'Interview reminders', desc: 'A day before each scheduled interview.' },
  { key: 'weekly', label: 'Weekly summary', desc: 'Your applications and responses, every Monday.' },
  { key: 'product', label: 'Product updates', desc: 'Occasional news about new Jobocate features.' },
];

// Shared field focus ring (replaces the old #jbapp input:focus styled-jsx rule).
const FIELD =
  'w-full font-sans text-[14.5px] text-jb-ink bg-jb-paper border border-jb-line-input rounded-[11px] px-3.5 py-[11px] ' +
  'transition-[box-shadow,border-color] duration-150 focus:outline-none focus:border-jb-green focus:shadow-[0_0_0_3px_rgba(31,164,99,0.15)]';

/* ----------------------------------------------------------------- helpers --- */
function initialsFrom(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || first.toUpperCase();
}

// Skeleton shimmer block. Dimensions are layout data (inline); the gradient +
// animation come from the `animate-jb-shimmer` design token.
function Skel({ w, h, mb = 0, radius = 8 }) {
  return (
    <span
      className="block bg-[linear-gradient(90deg,#F2ECE0_25%,#E9E1D1_37%,#F2ECE0_63%)] bg-[length:720px_100%] animate-jb-shimmer"
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: h, marginBottom: mb, borderRadius: radius, display: 'block' }}
    />
  );
}

/* ----------------------------------------------------------------- screen --- */
export default function AppSettings() {
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    fullName: '',
    headline: '',
    email: '',
    location: '',
    linkedin: '',
  });
  // The whole preferences document, read through the shared summary helper.
  // Settings used to keep its own flattened copy under its own field names,
  // which is exactly how it drifted out of sync with /app/preferences.
  const [prefs, setPrefs] = useState(null);
  const [billing, setBilling] = useState(null);
  const [notif, setNotif] = useState({
    matches: false,
    interviews: false,
    weekly: false,
    product: false,
  });

  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [avatar, setAvatar] = useState('');
  const fileRef = useRef(null);

  // ------------------------------------------------------------- data load ---
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Profile — real data only, empty when absent.
      try {
        const res = await getUserProfile();
        const u = res?.user || res || null;
        if (u && !cancelled) {
          setProfile({
            fullName: u.name || '',
            headline: u.headline || '',
            email: u.email || '',
            location: u.location || '',
            linkedin: u.linkedin || '',
          });
          setAvatar(u.picture || '');
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }

      // Job preferences -> real values only, empty when the user hasn't set them.
      try {
        const res = await getUserPreferences();
        const p = res?.preferences || res || null;
        if (p && !cancelled) {
          setPrefs(p);

          const np = p.notifications || null;
          if (np) {
            setNotif({
              matches: !!np.matches,
              interviews: !!np.interviews,
              weekly: !!np.weekly,
              product: !!np.product,
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }

      // Plan & billing from entitlements — real plan only, empty otherwise.
      try {
        const res = await getEntitlements();
        const planType = res?.planType;
        if (planType && !cancelled) {
          const PRICE = { FREE: '$0/mo', PRO: '$29/mo', ELITE: '$79/mo', INTERVIEW: '$19/mo' };
          const pretty = String(planType).charAt(0) + String(planType).slice(1).toLowerCase();
          setBilling({
            planType,
            planName: `${pretty}${PRICE[planType] ? ` · ${PRICE[planType]}` : ''}`,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e);
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
    setSaveError(null);
  };

  const onProfileChange = (key, val) => {
    setProfile((p) => ({ ...p, [key]: val }));
    markDirty();
  };

  const toggleNotif = (key) => {
    setNotif((s) => ({ ...s, [key]: !s[key] }));
    markDirty();
  };

  // A failed write must never render as "✓ Saved". This previously swallowed
  // both requests and asserted success unconditionally, which hid the fact that
  // the profile PATCH was rejected outright for every user.
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const failures = [];
    try {
      await updateUserProfile({
        name: profile.fullName,
        headline: profile.headline,
        location: profile.location,
        linkedin: profile.linkedin,
      });
    } catch (e) {
      failures.push(`profile (${e.message || 'request failed'})`);
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
      failures.push(`notifications (${e.message || 'request failed'})`);
    }

    setSaving(false);
    if (failures.length) {
      setSaveError(`Couldn’t save ${failures.join(' and ')}. Your changes are still here — try again.`);
      setSaved(false);
      setDirty(true);
      return;
    }
    setSaved(true);
    setDirty(false);
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    setUploading(true);
    try {
      const res = await uploadProfilePicture(file);
      setAvatar(res?.pictureUrl || res?.user?.picture || '');
    } catch (err) {
      setPhotoError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // --------------------------------------------------------------- derived ---
  const activeTab = useMemo(() => TAB_DEFS.find((t) => t.id === tab) || {}, [tab]);
  const activeLabel = activeTab.label;
  const canSaveHere = !!activeTab.saves;
  const saveHint = saving
    ? 'Saving…'
    : saveError
      ? 'Not saved'
      : saved
        ? '✓ Saved'
        : dirty
          ? 'Unsaved changes'
          : '';

  const prefRows = useMemo(() => preferenceSummaryRows(prefs), [prefs]);

  // Email is deliberately read-only: changing it goes through
  // PATCH /api/users/email, which requires the current password (and is
  // unavailable to OAuth accounts). An editable box that silently discarded
  // what you typed was worse than no box.
  const profileFields = [
    { key: 'fullName', label: 'Full name', value: profile.fullName },
    { key: 'headline', label: 'Headline', value: profile.headline },
    { key: 'location', label: 'Location', value: profile.location },
    { key: 'linkedin', label: 'LinkedIn', value: profile.linkedin },
  ];

  return (
    <>
      <Head>
        <title>Settings — Jobocate</title>
      </Head>

      <div className="flex min-h-screen bg-jb-cream font-sans text-jb-ink [&_::-webkit-scrollbar]:w-2 [&_::-webkit-scrollbar]:h-2 [&_::-webkit-scrollbar-thumb]:bg-jb-line-3 [&_::-webkit-scrollbar-thumb]:rounded-lg">
        <AppSidebar active="settings" />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* HEADER */}
          <header className="sticky top-0 z-20 flex items-center gap-5 px-8 py-[15px] bg-[rgba(247,243,234,0.85)] backdrop-blur-[10px] border-b border-jb-line">
            <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-jb-ink-faint">
              Settings / {activeLabel}
            </div>
            <div className="flex-1" />
            {canSaveHere && saveHint && (
              <span className={`font-mono text-xs ${saveError ? 'text-jb-danger-ink' : 'text-jb-ink-subtle'}`}>
                {saveHint}
              </span>
            )}
            {canSaveHere ? (
              <button
                onClick={save}
                disabled={saving || !dirty}
                className={`font-sans text-[13.5px] font-bold text-jb-green-ink bg-jb-green border-none rounded-full px-[18px] py-[9px] ${saving || !dirty ? 'opacity-55 cursor-default' : 'cursor-pointer'}`}
              >
                Save changes
              </button>
            ) : (
              <span className="font-mono text-xs text-jb-ink-ghost">Read-only</span>
            )}
          </header>

          <div className="px-8 pt-[30px] pb-12 max-w-[1040px] w-full">
            <div className="mb-6">
              <h1 className="font-display font-normal text-[40px] leading-none tracking-[-0.01em] m-0">
                Settings
              </h1>
            </div>

            {error && <InlineError error={error} />}

            <div className="grid grid-cols-[210px_1fr] gap-8 items-start">
              {/* TABS */}
              <div className="flex flex-col gap-[3px] sticky top-[90px]">
                {TAB_DEFS.map((t) => {
                  const on = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`text-left flex items-center gap-2.5 font-sans text-[14.5px] border-none rounded-[10px] px-3.5 py-[11px] cursor-pointer ${on ? 'font-bold text-jb-ink bg-jb-soft' : 'font-medium text-jb-ink-muted bg-transparent'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-jb-green' : 'bg-transparent'}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* PANEL */}
              <div className="bg-jb-paper border border-jb-line-2 rounded-[18px] overflow-hidden">
                {/* PROFILE */}
                {tab === 'profile' && (
                  <div className="px-[30px] py-7">
                    <h2 className="text-lg font-bold mb-1">Profile</h2>
                    <p className="text-[13.5px] text-jb-ink-subtle mb-6">
                      This information shapes your matches and tailored applications.
                    </p>

                    <div className="flex items-center gap-4 pb-6 mb-6 border-b border-jb-soft-2">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="" className="w-16 h-16 flex-shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="w-16 h-16 flex-shrink-0 rounded-full bg-jb-green text-jb-green-ink flex items-center justify-center font-bold text-[22px]">
                          {initialsFrom(profile.fullName) || '—'}
                        </span>
                      )}
                      <div>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={onPickPhoto}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className={`font-sans text-[13.5px] font-semibold text-jb-ink bg-jb-paper border border-jb-line-input rounded-full px-[15px] py-2 ${uploading ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                        >
                          {uploading ? 'Uploading…' : avatar ? 'Change photo' : 'Upload photo'}
                        </button>
                        <div className={`text-xs mt-[7px] ${photoError ? 'text-jb-danger-ink' : 'text-jb-ink-ghost'}`}>
                          {photoError || 'JPG, PNG, GIF or WEBP, up to 5MB.'}
                        </div>
                      </div>
                    </div>

                    {saveError && (
                      <div className="text-[13px] text-jb-danger-ink bg-jb-danger-tint border border-jb-danger-line rounded-[10px] px-[13px] py-2.5 mb-[18px]">
                        {saveError}
                      </div>
                    )}

                    {loading ? (
                      <div className="grid grid-cols-2 gap-[18px]">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i}>
                            <Skel w={90} h={13} mb={7} />
                            <Skel w="100%" h={42} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-[18px]">
                        {profileFields.map((f) => (
                          <div key={f.key}>
                            <label htmlFor={`profile-${f.key}`} className="block text-[13px] font-semibold text-jb-ink-heading mb-[7px]">
                              {f.label}
                            </label>
                            <input
                              id={`profile-${f.key}`}
                              name={f.key}
                              value={f.value || ''}
                              onChange={(e) => onProfileChange(f.key, e.target.value)}
                              placeholder={`Add your ${f.label.toLowerCase()}`}
                              className={FIELD}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {!loading && (
                      <div className="mt-[22px] pt-5 border-t border-jb-soft-2">
                        <label className="block text-[13px] font-semibold text-jb-ink-heading mb-[7px]">
                          Email
                        </label>
                        <div className="flex items-center justify-between gap-4 flex-wrap text-[14.5px] text-jb-ink-muted bg-jb-cream border border-jb-line-2 rounded-[11px] px-3.5 py-[11px]">
                          <span>{profile.email || '—'}</span>
                          <span className="text-[12.5px] text-jb-ink-ghost">
                            Your sign-in address — changing it needs password confirmation.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* JOB PREFERENCES */}
                {tab === 'prefs' && (
                  <div className="px-[30px] py-7">
                    <div className="flex items-start justify-between gap-4 mb-[22px] flex-wrap">
                      <div>
                        <h2 className="text-lg font-bold mb-1">Job preferences</h2>
                        <p className="text-[13.5px] text-jb-ink-subtle m-0 max-w-[460px]">
                          Control which jobs you see and which Jobocate may apply to with your permission — roles, location, work authorization, compensation and auto-apply rules.
                        </p>
                      </div>
                      <Link
                        href="/app/preferences"
                        className="flex-shrink-0 inline-flex items-center gap-[7px] text-[13.5px] font-bold text-jb-green-ink bg-jb-green rounded-full px-[18px] py-2.5 no-underline"
                      >
                        Manage preferences →
                      </Link>
                    </div>
                    {prefRows.map((p, i) => (
                      <div key={p.key} className={`flex items-center justify-between gap-5 py-[15px] ${i < prefRows.length - 1 ? 'border-b border-jb-soft-2' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-[14.5px] font-semibold text-jb-ink mb-[3px]">{p.label}</div>
                          <div className="text-[13px] text-jb-ink-subtle">{p.desc}</div>
                        </div>
                        {loading ? (
                          <Skel w={96} h={32} radius={999} />
                        ) : p.value ? (
                          <span className="flex-shrink-0 max-w-[320px] text-[13.5px] font-semibold text-jb-green-text bg-jb-green-tint rounded-full px-[15px] py-2 whitespace-nowrap overflow-hidden text-ellipsis">{p.value}</span>
                        ) : p.offLabel ? (
                          <span className="flex-shrink-0 font-mono text-xs font-semibold tracking-[0.06em] uppercase text-jb-ink-subtle bg-[#F1EBDF] border border-[#E0D8C7] rounded-full px-[13px] py-1.5">{p.offLabel}</span>
                        ) : (
                          <Link href="/app/preferences" className="flex-shrink-0 text-[13px] font-semibold text-jb-green-text no-underline">Add {p.label.toLowerCase()} ›</Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* NOTIFICATIONS */}
                {tab === 'notif' && (
                  <div className="px-[30px] py-7">
                    <h2 className="text-lg font-bold mb-1">Notifications</h2>
                    <p className="text-[13.5px] text-jb-ink-subtle mb-[18px]">
                      Choose what reaches your inbox.
                    </p>
                    {NOTIF_DEFS.map((nDef, i) => {
                      const on = notif[nDef.key];
                      return (
                        <div key={nDef.key} className={`flex items-center justify-between gap-5 py-4 ${i < NOTIF_DEFS.length - 1 ? 'border-b border-jb-soft-2' : ''}`}>
                          <div className="flex-1">
                            <div className="text-[14.5px] font-semibold text-jb-ink mb-[3px]">{nDef.label}</div>
                            <div className="text-[13px] text-jb-ink-subtle">{nDef.desc}</div>
                          </div>
                          <button
                            onClick={() => toggleNotif(nDef.key)}
                            aria-pressed={on}
                            aria-label={nDef.label}
                            className={`flex-shrink-0 relative w-[46px] h-[26px] rounded-full border-none cursor-pointer transition-colors duration-200 ${on ? 'bg-jb-green' : 'bg-[#D2C9B7]'}`}
                          >
                            <span className={`absolute top-[3px] w-5 h-5 rounded-full bg-[#FBF8F1] shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[left] duration-200 ${on ? 'left-[23px]' : 'left-[3px]'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* BILLING */}
                {tab === 'billing' && (
                  <div className="px-[30px] py-7">
                    <h2 className="text-lg font-bold mb-6">Plan &amp; billing</h2>
                    {billing?.planName ? (
                      <div className="relative overflow-hidden bg-jb-deep rounded-2xl p-6 text-[#f2ede2] mb-[22px]">
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_90%_0%,rgba(31,164,99,0.3),transparent_60%)]" />
                        <div className="relative flex items-center justify-between gap-5 flex-wrap">
                          <div>
                            <div className="font-mono text-[11px] tracking-[0.1em] uppercase text-jb-green-on-dark mb-2">
                              Current plan
                            </div>
                            <div className="font-display text-[28px] text-[#fbf8f1]">
                              {billing.planName}
                            </div>
                          </div>
                          {/* Was App Offers — the candidate's *job offers* screen. */}
                          <Link
                            href={appRoute('App Subscription.dc.html')}
                            className="bg-jb-green text-jb-green-ink text-sm font-bold px-5 py-3 rounded-full no-underline"
                          >
                            Manage plan
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon="✦"
                        title="You’re on the Free plan"
                        hint="Upgrade to unlock unlimited auto-apply, interview prep and more."
                        action={
                          <Link
                            href={appRoute('App Upgrade.dc.html')}
                            className="inline-flex items-center gap-[7px] mt-1.5 text-sm font-bold text-jb-green-ink bg-jb-green rounded-full px-5 py-[11px] no-underline"
                          >
                            View plans →
                          </Link>
                        }
                      />
                    )}

                    <div className="flex gap-5 flex-wrap">
                      <Link href={appRoute('App Billing.dc.html')} className="text-[13px] font-semibold text-jb-green-text no-underline">
                        Billing history →
                      </Link>
                      <Link href={appRoute('App Payment Methods.dc.html')} className="text-[13px] font-semibold text-jb-green-text no-underline">
                        Manage payment methods →
                      </Link>
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
