'use client';

import { useState } from 'react';

/**
 * Editors for the optional résumé data: work experience, certifications and
 * standalone achievements.
 *
 * These live in Settings rather than on the résumé screen on purpose. The
 * generator reads them from the account and never asks for them again, so this
 * is the single place they are entered — a copy on the generator page would
 * drift from the account and the candidate would have no way to tell which one
 * their résumé was built from.
 *
 * All three are optional. Absent means a thinner résumé, never a blocked one.
 */

const T = {
  panel: 'var(--jb-v3-panel)',
  card: 'var(--jb-v3-card, var(--jb-v3-panel))',
  line: 'var(--jb-v3-line)',
  fg: 'var(--jb-v3-fg)',
  fg2: 'var(--jb-v3-fg-2)',
  fg3: 'var(--jb-v3-fg-3)',
  accent: 'var(--jb-v3-accent)',
  accentInk: 'var(--jb-v3-accent-ink)',
  accentLine: 'var(--jb-v3-accent-line)',
  mono: 'var(--jb-v3-font-mono)',
};

const labelStyle = {
  fontFamily: T.mono,
  fontSize: 10.5,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: T.fg3,
};

const input = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: 14,
  color: T.fg,
  background: T.panel,
  border: `1px solid ${T.line}`,
  borderRadius: 2,
  padding: '9px 12px',
};

const addBtn = {
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  color: T.accent,
  background: 'transparent',
  border: `1px dashed ${T.accentLine}`,
  borderRadius: 2,
  padding: '9px 14px',
  cursor: 'pointer',
  width: '100%',
};

const removeBtn = {
  fontFamily: 'inherit',
  fontSize: 12,
  fontWeight: 600,
  color: T.fg3,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
};

function Section({ title, hint, children, onAdd, addLabel, testId }) {
  return (
    <section data-testid={testId} style={{ marginBottom: 30 }}>
      <div style={{ ...labelStyle, marginBottom: 6 }}>{title}</div>
      {hint && (
        <p style={{ fontSize: 12.5, color: T.fg3, margin: '0 0 12px', maxWidth: 560 }}>
          {hint}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
        <button type="button" onClick={onAdd} style={addBtn}>
          + {addLabel}
        </button>
      </div>
    </section>
  );
}

function Row({ children, onRemove }) {
  return (
    <div
      style={{
        border: `1px solid ${T.line}`,
        borderRadius: 2,
        padding: 14,
        background: T.card,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {children}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onRemove} style={removeBtn}>
          Remove
        </button>
      </div>
    </div>
  );
}

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

export default function ProfileListEditors({
  experience = [],
  certifications = [],
  achievements = [],
  onChange,
}) {
  // One change handler for three lists: every edit replaces the whole array,
  // which keeps the parent's dirty-tracking and save path unchanged.
  const set = (key, next) => onChange({ [key]: next });

  const patch = (list, i, field, value) =>
    list.map((row, idx) => (idx === i ? { ...row, [field]: value } : row));

  return (
    <div data-testid="profile-list-editors">
      <Section
        testId="experience-editor"
        title="Work experience"
        hint="Optional, and the single biggest thing your résumé is built from. Achievements are the lines the generator will draw on most."
        addLabel="Add a role"
        onAdd={() =>
          set('experience', [
            ...experience,
            { title: '', company: '', startDate: '', endDate: '', current: false, achievements: [] },
          ])
        }
      >
        {experience.map((role, i) => (
          <Row key={i} onRemove={() => set('experience', experience.filter((_, x) => x !== i))}>
            <div style={grid2}>
              <input
                aria-label="Job title"
                placeholder="Job title"
                value={role.title || ''}
                onChange={(e) => set('experience', patch(experience, i, 'title', e.target.value))}
                style={input}
              />
              <input
                aria-label="Company"
                placeholder="Company"
                value={role.company || ''}
                onChange={(e) => set('experience', patch(experience, i, 'company', e.target.value))}
                style={input}
              />
            </div>
            <div style={grid2}>
              <input
                aria-label="Start date"
                placeholder="Start (e.g. 2019-01)"
                value={role.startDate || ''}
                onChange={(e) => set('experience', patch(experience, i, 'startDate', e.target.value))}
                style={input}
              />
              <input
                aria-label="End date"
                placeholder={role.current ? 'Present' : 'End (e.g. 2023-06)'}
                value={role.endDate || ''}
                disabled={role.current}
                onChange={(e) => set('experience', patch(experience, i, 'endDate', e.target.value))}
                style={{ ...input, opacity: role.current ? 0.5 : 1 }}
              />
            </div>
            <label style={{ fontSize: 13, color: T.fg2, display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={Boolean(role.current)}
                onChange={(e) => set('experience', patch(experience, i, 'current', e.target.checked))}
              />
              I currently work here
            </label>
            <textarea
              aria-label="Achievements"
              placeholder="One achievement per line — what changed because you were there."
              rows={3}
              value={(role.achievements || []).join('\n')}
              onChange={(e) =>
                set(
                  'experience',
                  patch(
                    experience,
                    i,
                    'achievements',
                    e.target.value.split('\n').filter((l) => l.trim()),
                  ),
                )
              }
              style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
            />
          </Row>
        ))}
      </Section>

      <Section
        testId="certifications-editor"
        title="Certifications"
        hint="Optional. Only ones you actually hold — the generator is forbidden from inventing credentials, and this is where the real list comes from."
        addLabel="Add a certification"
        onAdd={() => set('certifications', [...certifications, { name: '', issuer: '', year: '' }])}
      >
        {certifications.map((cert, i) => (
          <Row
            key={i}
            onRemove={() => set('certifications', certifications.filter((_, x) => x !== i))}
          >
            <input
              aria-label="Certification name"
              placeholder="Certification"
              value={cert.name || ''}
              onChange={(e) => set('certifications', patch(certifications, i, 'name', e.target.value))}
              style={input}
            />
            <div style={grid2}>
              <input
                aria-label="Issuer"
                placeholder="Issuer"
                value={cert.issuer || ''}
                onChange={(e) => set('certifications', patch(certifications, i, 'issuer', e.target.value))}
                style={input}
              />
              <input
                aria-label="Year"
                placeholder="Year"
                value={cert.year || ''}
                onChange={(e) => set('certifications', patch(certifications, i, 'year', e.target.value))}
                style={input}
              />
            </div>
          </Row>
        ))}
      </Section>

      <Section
        testId="achievements-editor"
        title="Achievements"
        hint="Optional. Things not tied to one job — talks, publications, awards, open source."
        addLabel="Add an achievement"
        onAdd={() => set('achievements', [...achievements, ''])}
      >
        {achievements.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <input
              aria-label="Achievement"
              placeholder="e.g. Speaker, NodeConf 2024"
              value={a}
              onChange={(e) =>
                set('achievements', achievements.map((v, x) => (x === i ? e.target.value : v)))
              }
              style={input}
            />
            <button
              type="button"
              onClick={() => set('achievements', achievements.filter((_, x) => x !== i))}
              style={{ ...removeBtn, whiteSpace: 'nowrap' }}
            >
              Remove
            </button>
          </div>
        ))}
      </Section>
    </div>
  );
}
