'use client';

/**
 * ATS compatibility panel.
 *
 * Surfaces the two engines the backend exposes, kept visually distinct because
 * they answer different questions:
 *
 *   - The generic score is a property of the DOCUMENT ("will a parser read
 *     this?"). Deterministic, persisted, and what the library sorts on.
 *   - The job match is a property of a PAIRING. Ephemeral, recomputed on
 *     demand, and never allowed to look like it changed the stored score.
 *
 * Every finding renders with its fix. A severity chip alone would tell a
 * candidate they have a problem without telling them what to do about it,
 * which is the failure mode this whole feature exists to avoid.
 */

import { useState } from 'react';
import { checkAts, matchAts } from '@/services/atsApi';

const MONO = 'var(--jb-font-mono, ui-monospace, monospace)';

const SEVERITY = {
  critical: { bg: '#FDE4E0', fg: '#B23A22', bd: '#F0C4BB', label: 'CRITICAL' },
  warning: { bg: '#FFF3D9', fg: '#8A6100', bd: '#F0DDAE', label: 'WARNING' },
  info: { bg: '#EFF3F8', fg: '#425A78', bd: '#D6DFEC', label: 'INFO' },
};

const btn = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: '#1B1A16',
  background: '#FFFEFB',
  border: '1px solid #D9D0BE',
  borderRadius: 999,
  padding: '9px 16px',
  cursor: 'pointer',
};

/**
 * Turn a 0-100 score into a phrase shown to the candidate.
 *
 * Deliberately conservative: the previous panel said "Excellent — clears
 * automated screening for 9 of 10 roles" at every score, including bad ones.
 * We can honestly describe how machine-readable a document is; we cannot
 * predict outcomes, so nothing here promises one.
 */
function scoreLabel(score) {
  if (score >= 90) return { title: 'Reads cleanly', hint: 'No parsing problems found.' };
  if (score >= 75) return { title: 'Mostly readable', hint: 'A few things could trip a parser.' };
  if (score >= 50) return { title: 'Needs work', hint: 'A parser will likely lose some of this.' };
  if (score > 0) return { title: 'Hard to parse', hint: 'Much of this may not survive an ATS.' };
  return { title: 'Unreadable', hint: 'An ATS sees an empty document.' };
}

function Ring({ value }) {
  const size = 58;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value || 0));
  const color = pct >= 75 ? '#1FA463' : pct >= 50 ? '#C98A24' : '#B23A22';

  return (
    <svg width={size} height={size} role="img" aria-label={`ATS score ${pct} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDE6D8" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (pct / 100) * c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fontSize="15" fontWeight="700" fill="#1B1A16">
        {pct}
      </text>
    </svg>
  );
}

// `onScore` lets the parent know a check produced a score. Without it the page
// keeps rendering its own "Résumé strength" ring alongside this one, because
// the persisted `atsScore` it gates on is only refreshed on reload.
export default function AtsPanel({ resumeId, initialScore = null, initialReport = null, onScore }) {
  const [report, setReport] = useState(initialReport);
  const [score, setScore] = useState(initialScore);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const [jdOpen, setJdOpen] = useState(false);
  const [jd, setJd] = useState('');
  const [match, setMatch] = useState(null);
  const [matching, setMatching] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    setError('');
    try {
      const result = await checkAts(resumeId);
      setReport(result);
      const next = result?.score ?? null;
      setScore(next);
      if (typeof next === 'number' && onScore) onScore(next);
    } catch (e) {
      setError(e.message || 'Could not check this résumé.');
    } finally {
      setChecking(false);
    }
  };

  const runMatch = async () => {
    if (!jd.trim()) return;
    setMatching(true);
    setError('');
    try {
      setMatch(await matchAts(resumeId, jd));
    } catch (e) {
      setError(e.message || 'Could not check against that job.');
    } finally {
      setMatching(false);
    }
  };

  const findings = report?.findings || [];
  const label = scoreLabel(score ?? 0);
  const hasScore = typeof score === 'number';

  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {hasScore ? <Ring value={score} /> : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>
            {hasScore ? label.title : 'ATS compatibility'}
          </div>
          <div style={{ fontSize: 13, color: '#5A544A' }}>
            {hasScore ? label.hint : 'Check whether an applicant-tracking system can read this résumé.'}
          </div>
        </div>
        <button type="button" onClick={runCheck} disabled={checking} style={btn}>
          {checking ? 'Checking…' : hasScore ? 'Re-check' : 'Check now'}
        </button>
      </div>

      {error && (
        <div role="status" style={{ marginTop: 12, fontSize: 12.5, color: '#B23A22' }}>
          {error}
        </div>
      )}

      {findings.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed #E6DECF' }}>
          <p style={{ fontSize: 11.5, fontWeight: 700, color: '#6B655A', letterSpacing: '0.04em', margin: '0 0 10px' }}>
            {findings.length} THING{findings.length === 1 ? '' : 'S'} TO FIX
          </p>
          {findings.map((f) => {
            const s = SEVERITY[f.severity] || SEVERITY.info;
            return (
              <div key={f.code} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 999,
                      background: s.bg,
                      color: s.fg,
                      border: `1px solid ${s.bd}`,
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontSize: 13, color: '#1B1A16' }}>{f.message}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#5A544A', marginTop: 3 }}>→ {f.fix}</div>
              </div>
            );
          })}
        </div>
      )}

      {hasScore && findings.length === 0 && report && (
        <div style={{ marginTop: 14, fontSize: 13, color: '#157A49' }}>
          No parsing problems found.
        </div>
      )}

      {/* ---- Job match: a separate question, visually separated ---- */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed #E6DECF' }}>
        <button
          type="button"
          onClick={() => setJdOpen((o) => !o)}
          style={{ ...btn, border: 'none', background: 'transparent', padding: 0, color: '#157A49' }}
        >
          {jdOpen ? 'Hide job match' : 'Check against a specific job →'}
        </button>

        {jdOpen && (
          <div style={{ marginTop: 11 }}>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job description…"
              aria-label="Job description"
              rows={5}
              style={{
                width: '100%',
                fontFamily: 'inherit',
                fontSize: 13,
                border: '1px solid #D9D0BE',
                borderRadius: 10,
                padding: 10,
                background: '#FFFEFB',
                resize: 'vertical',
              }}
            />
            <button type="button" onClick={runMatch} disabled={matching || !jd.trim()} style={{ ...btn, marginTop: 9 }}>
              {matching ? 'Checking…' : 'Check coverage'}
            </button>

            {match && (
              <div style={{ marginTop: 13 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>
                  {match.coverage}% of what this job asks for
                  <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 500, color: '#8A8375' }}>
                    {' '}· {match.matched.length}/{match.keywordCount} concepts
                  </span>
                </div>
                {/* This result is never stored — it describes a pairing, not the document. */}
                <p style={{ fontSize: 11.5, color: '#8A8375', margin: '3px 0 9px' }}>
                  Not saved to your résumé — it changes with every job.
                </p>

                {match.missing.length > 0 ? (
                  <div style={{ fontSize: 13, color: '#5A544A' }}>
                    <strong style={{ color: '#1B1A16' }}>Not evidenced yet:</strong> {match.missing.join(', ')}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#157A49' }}>
                    Your résumé evidences everything this job named.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
