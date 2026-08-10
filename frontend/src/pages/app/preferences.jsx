'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { LoadingState, ErrorState } from '@/components/app/AppStates';
import { getUserPreferences, updateUserPreferences } from '@/services/api';
import { getMatchPreview } from '@/services/matchesApi';
import {
  COUNTRIES, WORKPLACES, REMOTE_SCOPES, EMPLOYMENTS, CURRENCIES, PERIODS,
  REVIEW_MODES, WORKAUTH_SUGGEST,
  arr, countryName, summarizePreferences, preferenceReadiness,
} from '@/lib/preferenceSummary';

/* --------------------------------------------------------------- tokens */
const MONO = 'var(--jb-font-mono)';
const SERIF = 'var(--jb-font-display)';

const TILE = {
  blue: { bg: '#E9F0FE', ink: '#2D6CDF' },
  green: { bg: '#EAF6EE', ink: '#157A49' },
  purple: { bg: '#ECEDFE', ink: '#4B4DED' },
  amber: { bg: '#FBF1E8', ink: '#C9622E' },
};

/* ============================================================== PAGE === */
export default function JobPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error
  const [open, setOpen] = useState({ workauth: true });
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [preview, setPreview] = useState(null);
  const pending = useRef({});
  const timer = useRef(null);
  const previewTimer = useRef(null);
  const workauthRef = useRef(null);

  const fetchPreview = useCallback(async () => {
    try { setPreview(await getMatchPreview()); } catch (e) { setPreview({ error: true }); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await getUserPreferences(); setPrefs(res?.preferences || res || {}); }
    catch (e) { setError(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); fetchPreview(); }, [load, fetchPreview]);

  // Autosave: optimistic local update + debounced partial PUT (accumulates changes).
  const flush = useCallback(async () => {
    const body = pending.current; pending.current = {};
    if (!Object.keys(body).length) return;
    setSaveState('saving');
    try { await updateUserPreferences(body); setSaveState('saved'); }
    catch (e) { setSaveState('error'); pending.current = { ...body, ...pending.current }; }
  }, []);
  const set = useCallback((field, value) => {
    setPrefs((p) => ({ ...(p || {}), [field]: value }));
    pending.current = { ...pending.current, [field]: value };
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 650);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(fetchPreview, 1600);
  }, [flush, fetchPreview]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (previewTimer.current) clearTimeout(previewTimer.current); }, []);

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const r = useMemo(() => preferenceReadiness(prefs), [prefs]);
  const sum = useMemo(() => summarizePreferences(prefs), [prefs]);

  // A complete form is not the same thing as a working search. When every field
  // is filled but the pool returns nothing, say so here rather than let the
  // ring claim "all set" directly above a "0 recommended" tile.
  const noResults = !!preview && !preview.error && r.matchReady && (preview.recommended ?? 0) === 0;

  const scrollToWorkAuth = () => { setOpen((o) => ({ ...o, workauth: true })); workauthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };

  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved automatically';
  const saveColor = saveState === 'error' ? '#B4472A' : saveState === 'saving' ? '#C9622E' : '#157A49';

  return (
    <>
      <Head>
        <title>Job Preferences — Jobocate</title>
      </Head>
      <style jsx global>{`
        #jbapp ::-webkit-scrollbar { width: 8px; height: 8px; }
        #jbapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #jbapp input:focus, #jbapp select:focus { outline: none; border-color: #1fa463; box-shadow: 0 0 0 3px rgba(31,164,99,0.15); }
        #jbapp .pref-btn:focus-visible { outline: 2px solid #1FA463; outline-offset: 2px; }
        #jbapp .pref-acc { transition: box-shadow .16s ease, border-color .16s ease; }
        #jbapp .pref-acc:hover { border-color: #DCD3C1; }
        #jbapp .pref-chev { transition: transform .2s ease; }
        @media (max-width: 780px) { #jbapp .pref-hero { flex-direction: column !important; } #jbapp .pref-hero-stats { border-left: none !important; border-top: 1px solid #2C2A22; width: 100% !important; } #jbapp .pref-grid2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}>
        <AppSidebar active="settings" />
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 32px', background: 'rgba(247,243,234,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9286' }}>Settings / Job Preferences</div>
            <div style={{ flex: 1 }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: saveColor }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: saveColor }} />{saveLabel}
            </span>
            <Link href="/app/settings" style={{ fontSize: 13.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', borderRadius: 999, padding: '9px 20px', textDecoration: 'none' }}>Done</Link>
          </header>

          <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: '28px 24px 90px' }}>
            {loading ? <LoadingState label="Loading your preferences…" /> : error ? <ErrorState error={error} onRetry={load} /> : (
              <>
                <h1 style={{ fontFamily: SERIF, fontWeight: 400, fontSize: 42, lineHeight: 1.04, margin: '0 0 10px' }}>Job preferences</h1>
                <p style={{ fontSize: 16, color: '#5A544A', margin: '0 0 22px', maxWidth: 640, lineHeight: 1.55 }}>
                  These decide which roles you see — and which ones Jobocate may apply to on your behalf. Auto-apply only ever runs <b>with your permission</b>, and never when something critical is missing.
                </p>

                {/* DARK HERO */}
                <div className="pref-hero" style={{ display: 'flex', background: '#15140F', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ flex: '1.35', display: 'flex', alignItems: 'center', gap: 22, padding: '26px 28px', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 12% 30%, rgba(31,164,99,0.18), transparent 55%)', pointerEvents: 'none' }} />
                    <Ring pct={r.completeness} />
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 19, fontWeight: 700, color: '#FBF8F1', marginBottom: 6 }}>
                        {r.missingCritical.length
                          ? `${r.missingCritical.length === 1 ? 'One critical item' : r.missingCritical.length + ' critical items'} left`
                          : noResults
                            ? 'Preferences complete — no matches yet'
                            : 'You’re all set'}
                      </div>
                      <div style={{ fontSize: 13.5, color: '#B8B1A4', lineHeight: 1.5, maxWidth: 300 }}>
                        {r.missingCritical.length
                          ? `Add your ${r.missingCritical[0]} so Jobocate can confirm which roles you’re eligible for and safely auto-apply.`
                          : noResults
                            ? 'Nothing in the current pool clears your filters. Widening your locations or lowering the minimum match score below will surface more.'
                            : 'Your preferences are tuned. Auto-apply stays off until you turn it on.'}
                      </div>
                    </div>
                  </div>
                  <div className="pref-hero-stats" style={{ display: 'flex', width: '46%' }}>
                    <HeroStat label="Recommendations" value={r.matchReady ? 'Tuned' : 'Incomplete'} dot={r.matchReady ? '#1FA463' : '#8A8378'} ink={r.matchReady ? '#5BD08C' : '#B8B1A4'} />
                    <HeroStat label="Auto-apply" value={r.autoApplyOn ? 'On' : 'Off'} dot={r.autoApplyOn ? '#1FA463' : '#6B655A'} ink={r.autoApplyOn ? '#5BD08C' : '#B8B1A4'} />
                    <HeroStat label="Missing critical" value={String(r.missingCritical.length)} dot={r.missingCritical.length ? '#E07B52' : '#1FA463'} ink={r.missingCritical.length ? '#E89A8E' : '#5BD08C'} last />
                  </div>
                </div>

                {/* MISSING NOTICE */}
                {r.missingCritical.length > 0 && !noticeDismissed && (
                  <button className="pref-btn" onClick={scrollToWorkAuth} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', background: '#FBF1E8', border: '1px solid #E9D8C2', borderRadius: 14, padding: '14px 18px', marginBottom: 22, cursor: 'pointer' }}>
                    <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, background: '#F0C9B0', color: '#8A5A22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>!</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#8A5A22' }}>Add your {r.missingCritical[0]}</span>
                      <span style={{ display: 'block', fontSize: 13, color: '#B08A5A' }}>Required before we recommend eligible roles or turn on auto-apply.</span>
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#8A5A22', flexShrink: 0 }}>Finish now →</span>
                  </button>
                )}

                <PreviewPanel preview={preview} hasCountry={r.hasCountry} onRefresh={fetchPreview} />

                {/* GROUP: ELIGIBILITY & AUTO-APPLY */}
                <GroupHeader label="Eligibility & auto-apply" right="Required" />

                <Section id="location" icon="⌖" tile="blue" title="Locations & work arrangement" open={open.location} onToggle={() => toggle('location')}
                  status={r.hasCountry && r.hasArrangement ? <Pill kind="set" /> : <Pill kind="action" />}
                  summary={sum.locations || 'Where do you want to work?'}
                >
                  <div className="pref-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Current country" impactHint="Required for eligibility"><Select value={prefs.country || ''} onChange={(v) => set('country', v)} options={[['', 'Select…'], ...COUNTRIES]} /></Field>
                    <Field label="State / province / city"><Text value={prefs.region || ''} onChange={(v) => set('region', v)} placeholder="e.g. San Francisco" /></Field>
                  </div>
                  <Field label="Preferred work locations"><ChipInput values={arr(prefs.locations)} onChange={(v) => set('locations', v)} placeholder="e.g. San Francisco, Remote" /></Field>
                  {/* Also derive the legacy `remoteOnly` boolean the matching
                      scorer + auto-apply agent read (merged in from the retired
                      /preferences page): true only when Remote is the sole pick.
                      Both fields batch into one debounced save. */}
                  <Field label="Workplace types"><MultiToggle options={WORKPLACES} values={arr(prefs.workplaceTypes)} onChange={(v) => { set('workplaceTypes', v); set('remoteOnly', v.length > 0 && v.every((t) => t === 'remote')); }} /></Field>
                  {arr(prefs.workplaceTypes).includes('remote') && (
                    <Field label="Remote scope" hint="Remote doesn't always mean worldwide — Jobocate checks the employer's permitted hiring locations first.">
                      <Segmented options={REMOTE_SCOPES} value={prefs.remoteScope || 'current_country'} onChange={(v) => set('remoteScope', v)} />
                    </Field>
                  )}
                </Section>

                <div ref={workauthRef}>
                  <Section id="workauth" icon="✦" tile="green" title="Work authorization & relocation" open={open.workauth} onToggle={() => toggle('workauth')}
                    status={r.hasWorkAuth ? <Pill kind="set" /> : <Pill kind="action" />}
                    summary={sum.workAuth || 'Where are you authorized to work?'}
                    privacy="Used only to filter incompatible jobs. Detailed authorization is never shown publicly unless you choose to share it."
                  >
                    <Field label="I'm authorized to work in" impactHint="Required for safe auto-apply">
                      <ChipInput values={arr(prefs.workAuthCountries)} onChange={(v) => set('workAuthCountries', v.map((x) => x.toUpperCase()))} placeholder="e.g. United States, EU…" />
                    </Field>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {WORKAUTH_SUGGEST.filter((c) => !arr(prefs.workAuthCountries).includes(c)).map((c) => (
                        <button key={c} type="button" className="pref-btn" onClick={() => set('workAuthCountries', [...arr(prefs.workAuthCountries), c])} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '6px 12px', cursor: 'pointer' }}>+ {countryName(c)}</button>
                      ))}
                    </div>
                    <Toggle label="I need visa sponsorship" checked={!!prefs.visaSponsorshipNeeded} onChange={(v) => set('visaSponsorshipNeeded', v)} />
                  </Section>
                </div>

                {/* Open to relocation — standalone toggle card */}
                <div className="pref-acc" style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 16, padding: '16px 20px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <Toggle ariaLabel="Open to relocation" checked={!!prefs.willingToRelocate} onChange={(v) => { set('willingToRelocate', v); if (!v) set('internationalRelocation', false); }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Open to relocation</div>
                      <div style={{ fontSize: 13, color: '#8A8378' }}>Include roles that require moving, with relocation support.</div>
                    </div>
                  </div>
                  {prefs.willingToRelocate && (
                    <div style={{ marginTop: 12, paddingLeft: 54 }}>
                      <Toggle label="Open to international relocation" checked={!!prefs.internationalRelocation} onChange={(v) => set('internationalRelocation', v)} />
                    </div>
                  )}
                </div>

                <Section id="autoapply" icon="⚡" tile="amber" title="Auto-apply rules" open={open.autoapply} onToggle={() => toggle('autoapply')}
                  status={prefs.autoApplyEnabled ? <Pill kind="on" /> : <Pill kind="off" />}
                  summary={sum.autoApply || 'Off — you approve every application'}
                >
                  <p style={{ fontSize: 13, color: '#6B655A', margin: '-2px 0 4px', lineHeight: 1.55 }}>
                    Auto-apply is <b>off by default</b> and applies <b>only when every safety rule passes</b> — never when geography or work authorization is unknown, to duplicate/expired/low-confidence jobs, or when it would need to invent information.
                  </p>
                  <Toggle label="Enable controlled auto-apply" checked={!!prefs.autoApplyEnabled} onChange={(v) => {
                    if (v && !r.autoApplyReady) return; // gated
                    set('autoApplyEnabled', v);
                  }} />
                  {!r.autoApplyReady && (
                    <div style={{ fontSize: 12.5, color: '#8A5A22', background: '#FBF1E8', borderRadius: 10, padding: '9px 12px' }}>⚠️ Add a country, work authorization and at least one target role before this can be enabled.</div>
                  )}
                  <Field label="Review behavior"><Segmented options={REVIEW_MODES} value={prefs.autoApplyReviewMode || 'review_all'} onChange={(v) => set('autoApplyReviewMode', v)} vertical /></Field>
                  <div className="pref-grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="Minimum match to auto-apply"><Segmented options={[[80, '80%+'], [85, '85%+'], [90, '90%+'], [95, '95%+']]} value={prefs.autoApplyMinScore ?? 85} onChange={(v) => set('autoApplyMinScore', v)} /></Field>
                    <Field label="Max applications / day"><NumberField value={prefs.autoApplyMaxDaily ?? 10} onChange={(v) => set('autoApplyMaxDaily', v)} width={120} /></Field>
                  </div>
                </Section>

                {/* GROUP: SHARPEN YOUR MATCHES */}
                <GroupHeader label="Sharpen your matches" right="Optional" />

                <Section id="roles" icon="◎" tile="blue" title="Target roles" open={open.roles} onToggle={() => toggle('roles')}
                  status={arr(prefs.titles).length ? <Pill kind="set" /> : null}
                  summary={sum.roles || 'Add the roles you want'}
                >
                  <Field label="Preferred job titles" hint="We won't silently broaden a title into unrelated roles."><ChipInput values={arr(prefs.titles)} onChange={(v) => set('titles', v)} placeholder="e.g. Senior Product Designer" /></Field>
                </Section>

                <Section id="industries" icon="▣" tile="purple" title="Industries & employers" open={open.industries} onToggle={() => toggle('industries')}
                  status={arr(prefs.preferredIndustries).length ? <Pill kind="set" /> : null}
                  summary={sum.industries || 'Add industry preferences'}
                >
                  <Field label="Preferred industries"><ChipInput values={arr(prefs.preferredIndustries)} onChange={(v) => set('preferredIndustries', v)} placeholder="e.g. Fintech" /></Field>
                  <Field label="Excluded employers" hint="Never shown to employers."><ChipInput values={arr(prefs.companyBlocklist)} onChange={(v) => set('companyBlocklist', v)} placeholder="e.g. Acme Corp" /></Field>
                </Section>

                <Section id="comp" icon="$" tile="green" title="Employment & compensation" open={open.comp} onToggle={() => toggle('comp')}
                  status={prefs.salaryMin > 0 || arr(prefs.employmentTypes).length ? <Pill kind="set" /> : null}
                  summary={sum.compensation || 'Set compensation & type'}
                >
                  <Field label="Employment types"><MultiToggle options={EMPLOYMENTS} values={arr(prefs.employmentTypes)} onChange={(v) => set('employmentTypes', v)} /></Field>
                  <Field label="Minimum compensation" hint="Recommendation floor. A separate, stricter minimum applies to auto-apply.">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Select value={prefs.salaryCurrency || 'USD'} onChange={(v) => set('salaryCurrency', v)} options={CURRENCIES.map((c) => [c, c])} width={90} />
                      <NumberField value={prefs.salaryMin ?? 0} onChange={(v) => set('salaryMin', v)} width={160} />
                      <Select value={prefs.salaryPeriod || 'year'} onChange={(v) => set('salaryPeriod', v)} options={PERIODS} width={120} />
                    </div>
                  </Field>
                </Section>

                <Section id="recs" icon="◈" tile="purple" title="Recommendation controls" open={open.recs} onToggle={() => toggle('recs')}
                  status={prefs.minMatchScore != null ? <Pill kind="set" /> : null}
                  summary={sum.recommendations}
                >
                  <Field label="Minimum match score to recommend" hint="Lower to discover stretch roles; raise to see only the closest fits.">
                    <Segmented options={[[60, '60%+'], [70, '70%+'], [80, '80%+'], [90, '90%+']]} value={prefs.minMatchScore ?? 60} onChange={(v) => set('minMatchScore', v)} />
                  </Field>
                </Section>

                {/* NEVER SHOW ME */}
                <GroupHeader label="Never show me" />
                <div style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 12px' }}>Exclusions override match score — a role is hidden even when it&rsquo;s a strong match. Excluded employers are set under Industries &amp; employers.</p>
                  <ExclusionInput prefs={prefs} set={set} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

/* ===================================================== sub-components === */
function Ring({ pct }) {
  const v = Math.max(0, Math.min(100, pct || 0));
  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0, borderRadius: '50%', background: `conic-gradient(#1FA463 0% ${v}%, #2C2A22 ${v}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 74, height: 74, borderRadius: '50%', background: '#15140F', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#FBF8F1', lineHeight: 1 }}>{v}%</span>
        <span style={{ fontSize: 11, color: '#8A8378', letterSpacing: '0.08em', marginTop: 3 }}>complete</span>
      </div>
    </div>
  );
}
function HeroStat({ label, value, dot, ink, last }) {
  return (
    <div style={{ flex: 1, padding: '22px 18px', borderLeft: '1px solid #2C2A22' }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B655A', marginBottom: 12 }}>{label}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 18, fontWeight: 700, color: ink }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />{value}
      </div>
    </div>
  );
}
function PreviewPanel({ preview, hasCountry, onRefresh }) {
  const p = preview;
  const tiles = [
    { label: 'Recommended now', key: 'recommended', tone: 'good' },
    { label: 'Eligible (geography)', key: 'eligible' },
    { label: 'Excluded by location', key: 'excludedByGeography', tone: 'warn' },
    { label: 'Filtered by your prefs', key: 'excludedByPreference', tone: 'warn' },
    { label: 'Below your min match', key: 'belowMinMatch', tone: 'warn' },
    { label: 'Auto-apply eligible', key: 'autoApplyEligible', tone: 'good' },
  ];
  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 16, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span aria-hidden style={{ fontSize: 16 }}>◑</span>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Preview matching impact</h2>
        <div style={{ flex: 1 }} />
        <button type="button" className="pref-btn" onClick={onRefresh} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', borderRadius: 999, padding: '6px 13px', cursor: 'pointer' }}>Recalculate</button>
      </div>
      <p style={{ fontSize: 13, color: '#8A8378', margin: '0 0 14px' }}>Live counts from the {p && p.poolSize ? p.poolSize.toLocaleString() : '—'} roles we're currently tracking.</p>
      {!hasCountry ? (
        <div style={{ fontSize: 13.5, color: '#8A5A22', background: '#FBF1E8', borderRadius: 10, padding: '12px 14px' }}>Set your location above to preview how many roles you're eligible for.</div>
      ) : !p ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>{tiles.map((_, i) => <div key={i} style={{ height: 72, borderRadius: 12, background: '#EFE9DD' }} />)}</div>
      ) : p.error ? (
        <div style={{ fontSize: 13.5, color: '#9B4A2F' }}>Couldn't calculate right now. <button type="button" onClick={onRefresh} className="pref-btn" style={{ border: 'none', background: 'none', color: '#157A49', cursor: 'pointer', fontWeight: 600 }}>Retry</button></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
          {tiles.map((t, i) => (
            <div key={i} style={{ border: '1px solid #EEE7D9', borderRadius: 12, padding: '14px 16px', background: '#FFFEFB' }}>
              <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: t.tone === 'good' ? '#157A49' : t.tone === 'warn' ? '#B26A29' : '#1B1A16' }}>{(p[t.key] ?? 0).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#8A8378', marginTop: 6 }}>{t.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function GroupHeader({ label, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '22px 0 12px' }}>
      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9A9286' }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: '#E7E0D2' }} />
      {right && <span style={{ fontFamily: MONO, fontSize: 11, color: '#B7AE9C' }}>{right}</span>}
    </div>
  );
}
function Pill({ kind }) {
  const map = {
    set: { t: '✓ Set', bg: '#EAF6EE', bd: '#CDE9D6', ink: '#157A49' },
    action: { t: 'Action needed', bg: '#FBEDE4', bd: '#F0C9B0', ink: '#9B4A2F' },
    off: { t: 'Off', bg: '#F1EBDF', bd: '#E0D8C7', ink: '#8A8378' },
    on: { t: '● On', bg: '#EAF6EE', bd: '#CDE9D6', ink: '#157A49' },
  }[kind];
  return <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: map.bg, border: `1px solid ${map.bd}`, color: map.ink, whiteSpace: 'nowrap' }}>{map.t}</span>;
}
function Section({ icon, tile, title, summary, status, open, onToggle, children, privacy }) {
  const t = TILE[tile] || TILE.blue;
  return (
    <div className="pref-acc" style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="pref-btn" style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px' }}>
        <span aria-hidden style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: t.bg, color: t.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{title}</span>
          <span style={{ display: 'block', fontSize: 13, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary}</span>
        </span>
        {status}
        <span className="pref-chev" aria-hidden style={{ color: '#B7AE9C', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '4px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {privacy && <div style={{ fontSize: 12.5, color: '#6B655A', background: '#F4EFE4', borderRadius: 10, padding: '9px 12px' }}>🔒 {privacy}</div>}
          {children}
        </div>
      )}
    </div>
  );
}
// Excluded *employers* deliberately live in "Industries & employers" and are
// not repeated here — showing companyBlocklist in both places rendered the same
// chip twice on one screen and made removal ambiguous.
const EXCLUSION_FIELDS = ['excludedTitles', 'excludedKeywords', 'excludedIndustries'];

function ExclusionInput({ prefs, set }) {
  const [v, setV] = useState('');
  // Each chip remembers the list it came from, so removing it edits only that
  // list instead of rewriting all of them.
  const chips = EXCLUSION_FIELDS.flatMap((field) => arr(prefs[field]).map((value) => ({ field, value })));
  const add = () => {
    const t = v.trim();
    if (t && !chips.some((c) => c.value === t)) set('excludedKeywords', [...arr(prefs.excludedKeywords), t]);
    setV('');
  };
  const remove = ({ field, value }) => set(field, arr(prefs[field]).filter((k) => k !== value));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {chips.map((c, i) => (
        <span key={`${c.field}:${c.value}:${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#9B4A2F', background: '#FBEDE4', border: '1px solid #F0C9B0', borderRadius: 999, padding: '5px 11px' }}>
          {c.value}
          <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c.value}`} className="pref-btn" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9B4A2F', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} placeholder="Add an exclusion…" style={{ ...inp, width: 'auto', flex: '1 1 160px', minWidth: 140 }} />
    </div>
  );
}

/* --------------------------------------------------------- primitives -- */
function Field({ label, hint, impactHint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#2A2820' }}>{label}</span>
        {impactHint && <span style={{ fontSize: 11, color: '#9B4A2F', background: '#FBEDE4', borderRadius: 999, padding: '2px 8px' }}>{impactHint}</span>}
      </span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 12, color: '#9A9286', marginTop: 6, lineHeight: 1.5 }}>{hint}</span>}
    </label>
  );
}
function Text({ value, onChange, placeholder }) { return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inp} />; }
function NumberField({ value, onChange, width }) { return <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value || '0', 10))} style={{ ...inp, width: width || '100%' }} />; }
function Select({ value, onChange, options, width }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inp, width: width || '100%', cursor: 'pointer' }}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
function Toggle({ label, ariaLabel, checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel || label} onClick={() => onChange(!checked)} className="pref-btn" style={{ display: 'flex', alignItems: 'center', gap: 12, width: label ? '100%' : 'auto', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
      <span style={{ width: 42, height: 24, borderRadius: 999, background: checked ? '#1FA463' : '#DCD3C1', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
        <span style={{ position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </span>
      {label && <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>}
    </button>
  );
}
function MultiToggle({ options, values, onChange }) {
  const toggle = (k) => onChange(values.includes(k) ? values.filter((x) => x !== k) : [...values, k]);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([k, l]) => { const on = values.includes(k); return (
        <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} className="pref-btn" style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? '#1FA463' : '#E0D8C7'}`, background: on ? '#EAF6EE' : '#FFFEFB', color: on ? '#157A49' : '#5A544A' }}>{on ? '✓ ' : ''}{l}</button>
      ); })}
    </div>
  );
}
function Segmented({ options, value, onChange, vertical }) {
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 6, flexWrap: 'wrap' }}>
      {options.map(([v, l]) => { const on = value === v; return (
        <button key={String(v)} type="button" aria-pressed={on} onClick={() => onChange(v)} className="pref-btn" style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '9px 15px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', border: `1px solid ${on ? '#1FA463' : '#E0D8C7'}`, background: on ? '#EAF6EE' : '#FFFEFB', color: on ? '#157A49' : '#5A544A' }}>{l}</button>
      ); })}
    </div>
  );
}
function ChipInput({ values, onChange, placeholder }) {
  const [v, setV] = useState('');
  const add = () => { const t = v.trim(); if (t && !values.includes(t)) onChange([...values, t]); setV(''); };
  return (
    <div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {values.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, background: '#EAF6EE', color: '#157A49', borderRadius: 7, padding: '4px 8px' }}>
              {s}<button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label={`Remove ${s}`} className="pref-btn" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#157A49', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} placeholder={placeholder} style={inp} />
    </div>
  );
}
const inp = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E0D8C7', background: '#FFFEFB', fontFamily: 'inherit', fontSize: 15, color: '#1B1A16', boxSizing: 'border-box' };
