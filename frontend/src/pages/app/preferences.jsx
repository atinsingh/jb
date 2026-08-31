'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { LoadingState, ErrorState } from '@/components/app/AppStates';
import {
  Screen, Label, Ticks, MonoButton, MonoChip, MonoSwitch, EndRule, mono, HAIR,
} from '@/components/app/v3/kit';
import { getUserPreferences, updateUserPreferences } from '@/services/api';
import { getMatchPreview } from '@/services/matchesApi';
import {
  COUNTRIES, WORKPLACES, REMOTE_SCOPES, EMPLOYMENTS, CURRENCIES, PERIODS,
  REVIEW_MODES, WORKAUTH_SUGGEST,
  arr, countryName, summarizePreferences, preferenceReadiness,
} from '@/lib/preferenceSummary';

/**
 * v3's Profile screen: a completion meter, then a list of key/value rows that
 * open into an editor.
 *
 * The previous version of this page was the pre-v3 direction wearing v3 tokens
 * — emoji tiles, accordion cards, a conic-gradient ring, a shadowed pill knob.
 * None of those exist in the artboard, so the presentation is rebuilt here.
 * The data layer is not: the same debounced partial PUT, the same eligibility
 * fields, and the same auto-apply gate carry over unchanged, because those are
 * product behaviour rather than styling.
 *
 * Geometry is the artboard's: 860 wide, 40/28/80 padding, rows on a
 * 170px / 1fr / 70px grid, a 24-bar completion meter, hairlines only.
 */

const ROW = '170px 1fr 70px';

/* One row of the profile list. Collapsed it is key / value / Edit; expanded it
   drops the editor underneath, still inside the same hairline band. */
function PrefRow({ label, value, open, onToggle, children, tone }) {
  return (
    <div style={{ borderTop: HAIR }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: ROW,
          gap: 16,
          alignItems: 'baseline',
          padding: '15px 4px',
        }}
      >
        <span style={mono(9.5, '0.14em')}>{label}</span>
        <span
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: tone === 'missing' ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg)',
          }}
        >
          {value}
        </span>
        <MonoButton
          onClick={onToggle}
          style={{
            justifySelf: 'end',
            border: 0,
            padding: '2px 0',
            color: 'var(--jb-v3-accent)',
          }}
        >
          {open ? 'Done' : 'Edit'}
        </MonoButton>
      </div>
      {open && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '4px 4px 24px',
            maxWidth: 560,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function JobPreferences() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error
  const [open, setOpen] = useState({});
  const [preview, setPreview] = useState(null);
  const pending = useRef({});
  const timer = useRef(null);
  const previewTimer = useRef(null);

  const fetchPreview = useCallback(async () => {
    try { setPreview(await getMatchPreview()); } catch { setPreview({ error: true }); }
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
    catch { setSaveState('error'); pending.current = { ...body, ...pending.current }; }
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
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (previewTimer.current) clearTimeout(previewTimer.current);
  }, []);

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const r = useMemo(() => preferenceReadiness(prefs), [prefs]);
  const sum = useMemo(() => summarizePreferences(prefs), [prefs]);

  // A complete form is not the same thing as a working search. When every field
  // is filled but the pool returns nothing, say so rather than let the meter
  // read "100" above a zero-result search.
  const noResults =
    !r.missingCritical.length && preview && !preview.error && (preview.recommended ?? 0) === 0;

  const saveLabel =
    saveState === 'saving' ? 'Saving' : saveState === 'error' ? 'Save failed' : 'Saved';
  const saveInk = saveState === 'error' ? 'var(--jb-v3-danger)' : 'var(--jb-v3-fg-3)';

  const p = prefs || {};

  return (
    <>
      <Head>
        <title>Profile · Jobocate</title>
      </Head>
      {/* Plain <style>, not styled-jsx: that package is not installed in this
          app and every `<style jsx>` page already builds with a warning. */}
      <style>{`.pref-in:focus{outline:none;border-color:var(--jb-v3-accent)}`}</style>

      <Screen width={860} pad="40px 28px 80px">
        {loading ? (
          <LoadingState label="Loading your preferences…" />
        ) : error ? (
          <ErrorState error={error} onRetry={load} />
        ) : (
          <>
            {/* Completion header — mono label, the figure, then the meter
                filling the rest of the row. */}
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <span style={mono(10.5, '0.14em')}>Completion</span>
                <span style={{ ...mono(9.5, '0.14em'), color: saveInk }}>{saveLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 10 }}>
                <span
                  style={{
                    fontSize: 44,
                    fontWeight: 600,
                    letterSpacing: '-0.045em',
                    lineHeight: 1,
                  }}
                >
                  {r.completeness}
                  <span style={{ fontSize: 20, color: 'var(--jb-v3-fg-3)' }}>%</span>
                </span>
                <div style={{ flex: 1, paddingBottom: 6 }}>
                  <Ticks pct={r.completeness / 100} n={24} height={13} grow />
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--jb-v3-fg-2)',
                margin: '18px 0 30px',
                maxWidth: 560,
              }}
            >
              {r.missingCritical.length
                ? `Add your ${r.missingCritical[0]} so Jobocate can confirm which roles you are eligible for. Auto-apply stays off until it can.`
                : noResults
                  ? 'Nothing in the current pool clears your filters. Widening your locations or lowering the minimum match score will surface more.'
                  : 'These decide which roles you see, and which ones Jobocate may apply to on your behalf. Nothing is submitted without your approval.'}
            </p>

            {/* Live pool counts. Four figures on hairlines — no tiles. */}
            <Label
              action={
                <MonoButton onClick={fetchPreview} style={{ border: 0, padding: 0 }}>
                  Recalculate
                </MonoButton>
              }
            >
              Matching impact
            </Label>
            <div style={{ display: 'flex', gap: 40, borderTop: HAIR, padding: '16px 4px 20px' }}>
              {[
                ['Recommended', preview?.recommended, 'var(--jb-v3-accent)'],
                ['Eligible', preview?.eligible],
                ['Blocked by location', preview?.excludedByGeography],
                ['Auto-apply ready', preview?.autoApplyEligible],
              ].map(([label, v, ink]) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                      color: !r.hasCountry || !preview || preview.error ? 'var(--jb-v3-fg-3)' : ink || 'var(--jb-v3-fg)',
                    }}
                  >
                    {!r.hasCountry || !preview || preview.error ? '—' : (v ?? 0).toLocaleString()}
                  </div>
                  <div style={{ ...mono(9.5, '0.14em'), marginTop: 8 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ELIGIBILITY — the fields that gate what a candidate may be shown. */}
            <Label style={{ marginTop: 30 }}>Eligibility</Label>

            <PrefRow
              label="Country"
              value={p.country ? countryName(p.country) : 'Not set'}
              tone={p.country ? undefined : 'missing'}
              open={open.country}
              onToggle={() => toggle('country')}
            >
              <Field label="Current country">
                <Select
                  value={p.country || ''}
                  onChange={(v) => set('country', v)}
                  options={[['', 'Select…'], ...COUNTRIES]}
                />
              </Field>
              <Field label="State / province / city">
                <Text value={p.region || ''} onChange={(v) => set('region', v)} placeholder="e.g. San Francisco" />
              </Field>
            </PrefRow>

            <PrefRow
              label="Work auth"
              value={sum.workAuth || 'Not set'}
              tone={r.hasWorkAuth ? undefined : 'missing'}
              open={open.workauth}
              onToggle={() => toggle('workauth')}
            >
              <div style={{ ...mono(9.5, '0.14em'), lineHeight: 1.7 }}>
                Used only to filter roles you cannot legally take. Never shown to employers.
              </div>
              <Field label="Authorized to work in">
                <ChipInput
                  values={arr(p.workAuthCountries)}
                  onChange={(v) => set('workAuthCountries', v.map((x) => x.toUpperCase()))}
                  placeholder="e.g. US, EU…"
                />
              </Field>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WORKAUTH_SUGGEST.filter((c) => !arr(p.workAuthCountries).includes(c)).map((c) => (
                  <MonoChip
                    key={c}
                    onClick={() => set('workAuthCountries', [...arr(p.workAuthCountries), c])}
                  >
                    + {countryName(c)}
                  </MonoChip>
                ))}
              </div>
              <Switch
                label="I need visa sponsorship"
                checked={!!p.visaSponsorshipNeeded}
                onChange={(v) => set('visaSponsorshipNeeded', v)}
              />
            </PrefRow>

            <PrefRow
              label="Locations"
              value={sum.locations || 'Not set'}
              tone={r.hasCountry ? undefined : 'missing'}
              open={open.locations}
              onToggle={() => toggle('locations')}
            >
              <Field label="Preferred work locations">
                <ChipInput
                  values={arr(p.locations)}
                  onChange={(v) => set('locations', v)}
                  placeholder="e.g. San Francisco, Remote"
                />
              </Field>
              {/* Also derives the legacy `remoteOnly` boolean the matching
                  scorer and auto-apply agent read: true only when Remote is
                  the sole pick. Both fields batch into one debounced save. */}
              <Field label="Workplace types">
                <ChipSet
                  options={WORKPLACES}
                  values={arr(p.workplaceTypes)}
                  onChange={(v) => {
                    set('workplaceTypes', v);
                    set('remoteOnly', v.length > 0 && v.every((t) => t === 'remote'));
                  }}
                />
              </Field>
              {arr(p.workplaceTypes).includes('remote') && (
                <Field
                  label="Remote scope"
                  hint="Remote does not always mean worldwide — Jobocate checks the employer's permitted hiring locations first."
                >
                  <ChipSet
                    single
                    options={REMOTE_SCOPES}
                    values={[p.remoteScope || 'current_country']}
                    onChange={(v) => set('remoteScope', v[0])}
                  />
                </Field>
              )}
            </PrefRow>

            <PrefRow
              label="Relocation"
              value={
                p.willingToRelocate
                  ? p.internationalRelocation
                    ? 'Open, including internationally'
                    : 'Open, within country'
                  : 'Not open to relocating'
              }
              open={open.relocation}
              onToggle={() => toggle('relocation')}
            >
              <Switch
                label="Open to relocation"
                checked={!!p.willingToRelocate}
                onChange={(v) => {
                  set('willingToRelocate', v);
                  if (!v) set('internationalRelocation', false);
                }}
              />
              {p.willingToRelocate && (
                <Switch
                  label="Open to international relocation"
                  checked={!!p.internationalRelocation}
                  onChange={(v) => set('internationalRelocation', v)}
                />
              )}
            </PrefRow>

            {/* AUTO-APPLY — off by default, and gated on the eligibility fields. */}
            <Label style={{ marginTop: 30 }}>Auto-apply</Label>

            <PrefRow
              label="Rules"
              value={sum.autoApply || 'Off — you approve every application'}
              open={open.autoapply}
              onToggle={() => toggle('autoapply')}
            >
              <p style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)', margin: 0, lineHeight: 1.6 }}>
                Auto-apply is off by default and runs only when every safety rule passes — never
                when geography or work authorization is unknown, never to duplicate, expired or
                low-confidence jobs, and never where it would have to invent information.
              </p>
              <Switch
                label="Enable controlled auto-apply"
                checked={!!p.autoApplyEnabled}
                disabled={!r.autoApplyReady}
                onChange={(v) => {
                  if (v && !r.autoApplyReady) return; // gated
                  set('autoApplyEnabled', v);
                }}
              />
              {!r.autoApplyReady && (
                <div style={mono(9.5, '0.14em', 'var(--jb-v3-danger)')}>
                  Add a country, work authorization and at least one target role first
                </div>
              )}
              <Field label="Review behaviour">
                <ChipSet
                  single
                  options={REVIEW_MODES}
                  values={[p.autoApplyReviewMode || 'review_all']}
                  onChange={(v) => set('autoApplyReviewMode', v[0])}
                />
              </Field>
              <Field label="Minimum match to auto-apply">
                <ChipSet
                  single
                  options={[[80, '80+'], [85, '85+'], [90, '90+'], [95, '95+']]}
                  values={[p.autoApplyMinScore ?? 85]}
                  onChange={(v) => set('autoApplyMinScore', v[0])}
                />
              </Field>
              <Field label="Max applications per day">
                <NumberField
                  value={p.autoApplyMaxDaily ?? 10}
                  onChange={(v) => set('autoApplyMaxDaily', v)}
                  width={120}
                />
              </Field>
            </PrefRow>

            {/* TARGETING — optional, sharpens the ranking rather than gating it. */}
            <Label style={{ marginTop: 30 }}>Targeting</Label>

            <PrefRow
              label="Roles"
              value={sum.roles || 'Not set'}
              tone={r.hasRoles ? undefined : 'missing'}
              open={open.roles}
              onToggle={() => toggle('roles')}
            >
              <Field label="Preferred job titles" hint="A title is never silently broadened into unrelated roles.">
                <ChipInput
                  values={arr(p.titles)}
                  onChange={(v) => set('titles', v)}
                  placeholder="e.g. Senior Product Designer"
                />
              </Field>
            </PrefRow>

            <PrefRow
              label="Industries"
              value={sum.industries || 'Any'}
              open={open.industries}
              onToggle={() => toggle('industries')}
            >
              <Field label="Preferred industries">
                <ChipInput
                  values={arr(p.preferredIndustries)}
                  onChange={(v) => set('preferredIndustries', v)}
                  placeholder="e.g. Fintech"
                />
              </Field>
              <Field label="Excluded employers" hint="Never shown to employers.">
                <ChipInput
                  values={arr(p.companyBlocklist)}
                  onChange={(v) => set('companyBlocklist', v)}
                  placeholder="e.g. Acme Corp"
                />
              </Field>
            </PrefRow>

            <PrefRow
              label="Compensation"
              value={sum.compensation || 'Not set'}
              tone={r.hasSalary ? undefined : 'missing'}
              open={open.comp}
              onToggle={() => toggle('comp')}
            >
              <Field label="Employment types">
                <ChipSet
                  options={EMPLOYMENTS}
                  values={arr(p.employmentTypes)}
                  onChange={(v) => set('employmentTypes', v)}
                />
              </Field>
              <Field
                label="Minimum compensation"
                hint="A recommendation floor. A separate, stricter minimum applies to auto-apply."
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Select
                    value={p.salaryCurrency || 'USD'}
                    onChange={(v) => set('salaryCurrency', v)}
                    options={CURRENCIES.map((c) => [c, c])}
                    width={92}
                  />
                  <NumberField value={p.salaryMin ?? 0} onChange={(v) => set('salaryMin', v)} width={160} />
                  <Select
                    value={p.salaryPeriod || 'year'}
                    onChange={(v) => set('salaryPeriod', v)}
                    options={PERIODS}
                    width={120}
                  />
                </div>
              </Field>
            </PrefRow>

            <PrefRow
              label="Match floor"
              value={sum.recommendations}
              open={open.recs}
              onToggle={() => toggle('recs')}
            >
              <Field
                label="Minimum match score to recommend"
                hint="Lower it to discover stretch roles; raise it to see only the closest fits."
              >
                <ChipSet
                  single
                  options={[[60, '60+'], [70, '70+'], [80, '80+'], [90, '90+']]}
                  values={[p.minMatchScore ?? 60]}
                  onChange={(v) => set('minMatchScore', v[0])}
                />
              </Field>
            </PrefRow>

            <PrefRow
              label="Never show"
              value={
                EXCLUSION_FIELDS.reduce((n, f) => n + arr(p[f]).length, 0)
                  ? `${EXCLUSION_FIELDS.reduce((n, f) => n + arr(p[f]).length, 0)} exclusions`
                  : 'None'
              }
              open={open.excl}
              onToggle={() => toggle('excl')}
            >
              <div style={{ fontSize: 13, color: 'var(--jb-v3-fg-2)', lineHeight: 1.6 }}>
                Exclusions override match score — a role is hidden even when it is a strong match.
                Excluded employers are set under Industries.
              </div>
              <ExclusionInput prefs={p} set={set} />
            </PrefRow>

            <EndRule />
          </>
        )}
      </Screen>
    </>
  );
}

/* --------------------------------------------------------- primitives -- */

const inp = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 2,
  border: '1px solid var(--jb-v3-line-2)',
  background: 'var(--jb-v3-panel)',
  fontFamily: 'inherit',
  fontSize: 14,
  color: 'var(--jb-v3-fg)',
  boxSizing: 'border-box',
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ ...mono(9.5, '0.14em'), display: 'block', marginBottom: 8 }}>{label}</span>
      {children}
      {hint && (
        <span
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--jb-v3-fg-3)',
            marginTop: 8,
            lineHeight: 1.55,
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function Text({ value, onChange, placeholder }) {
  return (
    <input
      className="pref-in"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inp}
    />
  );
}

function NumberField({ value, onChange, width }) {
  return (
    <input
      className="pref-in"
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value || '0', 10))}
      style={{ ...inp, width: width || '100%', fontFamily: 'var(--jb-v3-font-mono)' }}
    />
  );
}

function Select({ value, onChange, options, width }) {
  return (
    <select
      className="pref-in"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: width || '100%', cursor: 'pointer' }}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

/** v3's switch, with a label and an optional disabled state. */
function Switch({ label, checked, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <MonoSwitch
        checked={checked}
        onChange={() => !disabled && onChange(!checked)}
        label={label}
      />
      <span style={{ fontSize: 13.5 }}>{label}</span>
    </div>
  );
}

/** A row of chips. `single` makes it a radiogroup rather than a multi-select. */
function ChipSet({ options, values, onChange, single }) {
  const pick = (k) => {
    if (single) return onChange([k]);
    onChange(values.includes(k) ? values.filter((x) => x !== k) : [...values, k]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(([k, l]) => (
        <MonoChip key={String(k)} on={values.includes(k)} onClick={() => pick(k)}>
          {l}
        </MonoChip>
      ))}
    </div>
  );
}

function ChipInput({ values, onChange, placeholder }) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setV('');
  };
  return (
    <div>
      {values.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {values.map((s, i) => (
            <span
              key={i}
              style={{
                ...mono(10, '0.1em', 'var(--jb-v3-accent)'),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                border: '1px solid var(--jb-v3-accent-line)',
                background: 'var(--jb-v3-accent-soft)',
                borderRadius: 2,
                padding: '5px 10px',
              }}
            >
              {s}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={`Remove ${s}`}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--jb-v3-accent)',
                  fontSize: 13,
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="pref-in"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
        }}
        placeholder={placeholder}
        style={inp}
      />
    </div>
  );
}

// Excluded *employers* deliberately live under Industries and are not repeated
// here — showing companyBlocklist in both places rendered the same chip twice
// on one screen and made removal ambiguous.
const EXCLUSION_FIELDS = ['excludedTitles', 'excludedKeywords', 'excludedIndustries'];

function ExclusionInput({ prefs, set }) {
  const [v, setV] = useState('');
  // Each chip remembers the list it came from, so removing it edits only that
  // list instead of rewriting all of them.
  const chips = EXCLUSION_FIELDS.flatMap((field) =>
    arr(prefs[field]).map((value) => ({ field, value })),
  );
  const add = () => {
    const t = v.trim();
    if (t && !chips.some((c) => c.value === t)) {
      set('excludedKeywords', [...arr(prefs.excludedKeywords), t]);
    }
    setV('');
  };
  const remove = ({ field, value }) => set(field, arr(prefs[field]).filter((k) => k !== value));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {chips.map((c, i) => (
        <span
          key={`${c.field}:${c.value}:${i}`}
          style={{
            ...mono(10, '0.1em', 'var(--jb-v3-danger)'),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            border: '1px solid var(--jb-v3-danger-line)',
            background: 'var(--jb-v3-danger-soft)',
            borderRadius: 2,
            padding: '5px 10px',
          }}
        >
          {c.value}
          <button
            type="button"
            onClick={() => remove(c)}
            aria-label={`Remove ${c.value}`}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--jb-v3-danger)',
              fontSize: 13,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="pref-in"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
        }}
        placeholder="Add an exclusion…"
        style={{ ...inp, width: 'auto', flex: '1 1 160px', minWidth: 140 }}
      />
    </div>
  );
}
