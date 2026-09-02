'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { LoadingState, ErrorState, InlineError } from '@/components/app/AppStates';
import ProfileListEditors from '@/components/app/resume/ProfileListEditors';
import {
  Screen,
  MonoButton,
  MonoSwitch,
  mono,
  HAIR,
} from '@/components/app/v3/kit';
import { getUserPreferences, updateUserPreferences } from '@/services/api';
import {
  getUserProfile,
  updateUserProfile,
  getEntitlements,
} from '@/services/settingsApi';

/*
 * v3's settings screen is a tab strip over a list of switch rows. The tabs are
 * mono micro-labels with the same active treatment as the top nav's groups —
 * bright ink and a 1px accent rule — so the two levels read as one system.
 */
const TABS = [
  { id: 'account', label: 'Account' },
  // The optional resume data. It lives here, not on the resume screen, so the
  // generator has exactly one source for it.
  { id: 'resume', label: 'Résumé details' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'plan', label: 'Plan' },
];

const NOTIF_ROWS = [
  { key: 'matches', label: 'New matches' },
  { key: 'interviews', label: 'Interview reminders' },
  { key: 'weekly', label: 'Weekly digest' },
  { key: 'product', label: 'Product updates' },
];

const field = {
  width: '100%',
  background: 'var(--jb-v3-panel)',
  border: '1px solid var(--jb-v3-line-2)',
  borderRadius: 2,
  padding: '9px 11px',
  fontFamily: 'inherit',
  fontSize: 13.5,
  color: 'var(--jb-v3-fg)',
};

function SwitchRow({ label, checked, onChange }) {
  return (
    <div
      style={{
        borderBottom: HAIR,
        padding: '17px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}
    >
      <span style={{ flex: 1, fontSize: 13.5 }}>{label}</span>
      <MonoSwitch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/**
 * `required` here means "the résumé generator cannot run without this", not
 * "the form will not submit". Settings stays savable in any state — a
 * half-filled profile is a normal thing to have — so the marker is a warning
 * about a downstream consequence, and the empty row says what that consequence
 * is rather than leaving the asterisk to be decoded.
 */
function TextRow({ label, value, onChange, readOnly, required }) {
  const empty = required && !String(value || '').trim();
  return (
    <div
      style={{
        borderBottom: HAIR,
        padding: '15px 4px',
        display: 'grid',
        gridTemplateColumns: '170px 1fr',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <span style={mono(10, '0.12em')}>
        {label}
        {required && (
          <abbr
            title="Required to generate a résumé"
            aria-label="required"
            data-testid={`required-${label.toLowerCase().replace(/\s+/g, '-')}`}
            style={{
              color: '#b4232a',
              marginLeft: 4,
              textDecoration: 'none',
              cursor: 'help',
            }}
          >
            *
          </abbr>
        )}
      </span>
      {readOnly ? (
        <span style={{ fontSize: 13.5, color: 'var(--jb-v3-fg-2)' }}>{value || '—'}</span>
      ) : (
        <div>
          <input
            style={{
              ...field,
              // Only an empty required field is flagged. Colouring every
              // required field red would make the filled ones look wrong too.
              borderColor: empty ? '#e6b8ba' : field.borderColor,
            }}
            aria-required={required || undefined}
            aria-invalid={empty || undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {empty && (
            <p style={{ fontSize: 12, color: '#b4232a', margin: '6px 0 0' }}>
              Needed before you can generate a résumé.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppSettings() {
  const [tab, setTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState({
    fullName: '',
    headline: '',
    email: '',
    location: '',
    linkedin: '',
    experience: [],
    certifications: [],
    achievements: [],
  });
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
            experience: u.experience || [],
            certifications: u.certifications || [],
            achievements: u.achievements || [],
          });
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }

      try {
        const res = await getUserPreferences();
        const p = res?.preferences || res || null;
        const np = p?.notifications;
        if (np && !cancelled) {
          setNotif({
            matches: !!np.matches,
            interviews: !!np.interviews,
            weekly: !!np.weekly,
            product: !!np.product,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e);
      }

      // Plan from entitlements — real plan only, empty otherwise.
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

  // A failed write must never render as "Saved". Each request is reported
  // separately so a partial failure names the half that did not land.
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
        experience: profile.experience,
        certifications: profile.certifications,
        achievements: profile.achievements,
      });
    } catch (e) {
      failures.push(`profile (${e.message || 'request failed'})`);
    }
    try {
      await updateUserPreferences({ notifications: { ...notif } });
    } catch (e) {
      failures.push(`notifications (${e.message || 'request failed'})`);
    }

    setSaving(false);
    if (failures.length) {
      setSaveError(
        new Error(
          `Couldn’t save ${failures.join(' and ')}. Your changes are still here — try again.`,
        ),
      );
      setSaved(false);
      setDirty(true);
      return;
    }
    setSaved(true);
    setDirty(false);
  };

  return (
    <>
      <Head>
        <title>Settings · Jobocate</title>
      </Head>

      <Screen width={860} pad="40px 28px 80px">
        <div style={{ display: 'flex', gap: 22, borderBottom: HAIR, marginBottom: 24 }}>
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={on ? 'true' : undefined}
                style={{
                  ...mono(10, '0.12em', on ? 'var(--jb-v3-fg)' : 'var(--jb-v3-fg-3)'),
                  background: 'none',
                  border: 0,
                  borderBottom: `1px solid ${on ? 'var(--jb-v3-accent)' : 'transparent'}`,
                  padding: '0 0 12px',
                  cursor: 'pointer',
                  transition: 'color .2s ease, border-color .2s ease',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {loading && <LoadingState label="Loading your settings…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && (
          <>
            {saveError && <InlineError error={saveError} />}

            {tab === 'account' && (
              <>
                <TextRow
                  label="Full name"
                  required
                  value={profile.fullName}
                  onChange={(v) => onProfileChange('fullName', v)}
                />
                <TextRow
                  label="Headline"
                  value={profile.headline}
                  onChange={(v) => onProfileChange('headline', v)}
                />
                {/* Email is changed through a verified flow, not this form. */}
                <TextRow label="Email" value={profile.email} readOnly required />
                <TextRow
                  label="Location"
                  required
                  value={profile.location}
                  onChange={(v) => onProfileChange('location', v)}
                />
                <TextRow
                  label="LinkedIn"
                  required
                  value={profile.linkedin}
                  onChange={(v) => onProfileChange('linkedin', v)}
                />
              </>
            )}

            {tab === 'resume' && (
              <ProfileListEditors
                experience={profile.experience}
                certifications={profile.certifications}
                achievements={profile.achievements}
                onChange={(patch) => {
                  setProfile((p) => ({ ...p, ...patch }));
                  setDirty(true);
                  setSaved(false);
                }}
              />
            )}

            {tab === 'notifications' &&
              NOTIF_ROWS.map((r) => (
                <SwitchRow
                  key={r.key}
                  label={r.label}
                  checked={notif[r.key]}
                  onChange={() => toggleNotif(r.key)}
                />
              ))}

            {tab === 'plan' && (
              <>
                <div
                  style={{
                    borderBottom: HAIR,
                    padding: '17px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13.5 }}>
                    {billing?.planName || 'No plan on file'}
                  </span>
                  <MonoButton href="/app/billing">Manage</MonoButton>
                </div>
                <div
                  style={{
                    borderBottom: HAIR,
                    padding: '17px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13.5 }}>Password and sign-in</span>
                  <MonoButton href="/app/security">Open</MonoButton>
                </div>
              </>
            )}

            {tab !== 'plan' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                <MonoButton filled onClick={save} disabled={!dirty || saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </MonoButton>
                {saved && <span style={mono(10, '0.12em', 'var(--jb-v3-ok)')}>Saved</span>}
              </div>
            )}
          </>
        )}
      </Screen>
    </>
  );
}
