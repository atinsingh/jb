'use client';

import { useMemo, useRef, useState } from 'react';

/**
 * Multi-select picker for ISO2 target countries.
 *
 * IMPORTANT: this offers exactly the countries the geography engine can resolve
 * (backend/src/geography/geo.constants.ts -> COUNTRIES). Offering the full ISO
 * list would let a candidate target a country the engine cannot normalize job
 * locations into, which silently yields an empty match list — a worse failure
 * than an honestly short list.
 *
 * Emits uppercase ISO2 codes, which is what
 * `JobProfile.targetCountries` validates against (`/^[A-Z]{2}$/`).
 *
 * Follows the inline-style cream/green convention used across /app/*
 * (see components/app/AppStates.jsx).
 */

/** Kept in sync with backend COUNTRIES. */
export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'JP', name: 'Japan' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

export const countryLabel = (code) =>
  SUPPORTED_COUNTRIES.find((c) => c.code === code)?.name || code;

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12.5,
  fontWeight: 600,
  color: '#0C2C1C',
  background: '#E3F5EA',
  border: '1px solid #B7E2CA',
  borderRadius: 999,
  padding: '5px 8px 5px 11px',
};

export default function CountryPicker({
  value = [],
  onChange,
  label = 'Target countries',
  hint = 'Where you want to work — not where you live now.',
  id = 'country-picker',
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const selected = Array.isArray(value) ? value : [];

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUPPORTED_COUNTRIES.filter(
      (c) =>
        !selected.includes(c.code) &&
        (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q),
    );
  }, [query, selected]);

  const add = (code) => {
    if (selected.includes(code)) return;
    onChange?.([...selected, code]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (code) => onChange?.(selected.filter((c) => c !== code));

  return (
    <div>
      <label
        htmlFor={id}
        style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1B1A16', marginBottom: 3 }}
      >
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: 12, color: '#6B655A', margin: '0 0 8px' }}>{hint}</p>
      )}

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map((code) => (
            <span key={code} style={chip}>
              {countryLabel(code)}
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={`Remove ${countryLabel(code)}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#157A49',
                  fontSize: 15,
                  lineHeight: 1,
                  padding: '0 4px',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id={id}
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={selected.length ? 'Add another country…' : 'Search countries…'}
        autoComplete="off"
        style={{
          width: '100%',
          fontFamily: 'inherit',
          fontSize: 14,
          color: '#1B1A16',
          background: '#FFFEFB',
          border: '1px solid #D9D0BE',
          borderRadius: 10,
          padding: '10px 12px',
        }}
      />

      <div
        role="listbox"
        aria-label="Available countries"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}
      >
        {matches.map((c) => (
          <button
            key={c.code}
            type="button"
            role="option"
            aria-selected="false"
            onClick={() => add(c.code)}
            style={{
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#3D3930',
              background: '#FFFEFB',
              border: '1px solid #D9D0BE',
              borderRadius: 999,
              padding: '5px 11px',
              cursor: 'pointer',
            }}
          >
            + {c.name}
          </button>
        ))}
        {matches.length === 0 && query.trim() && (
          <p style={{ fontSize: 12.5, color: '#6B655A', margin: 0 }}>
            No supported country matches “{query.trim()}”. Jobocate can only match jobs in the
            countries listed above.
          </p>
        )}
      </div>

      {selected.length === 0 && (
        <p style={{ fontSize: 12, color: '#8A8375', margin: '8px 0 0' }}>
          With none selected, matching falls back to the country in your preferences.
        </p>
      )}
    </div>
  );
}
