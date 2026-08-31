'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import {
  Screen,
  CellGrid,
  Label,
  EndRule,
  MonoButton,
  Ticks,
  mono,
  HAIR,
} from '@/components/app/v3/kit';
import { getMyOffers } from '@/services/offersApi';

const k = (n) => (n ? `$${n}k` : '—');

/* Flatten an application-with-offer into the shape the v3 screen renders. */
const fromApplication = (app, i) => {
  const offer = app.offer || app.offerDetails || {};
  const thousands = (v) => Math.round((v ?? 0) / 1000) || 0;
  const base = thousands(offer.baseSalary ?? offer.base ?? app.baseSalary);
  const equity = thousands(offer.equityPerYear ?? offer.equity);
  const signon = thousands(offer.signOnBonus ?? offer.signon);
  const bonus = thousands(offer.targetBonus ?? offer.bonus);
  return {
    id: app._id || app.id || `app-${i}`,
    company: app.companyName || app.company || app.job?.company || 'Company',
    title: app.jobTitle || app.title || app.job?.title || 'Role',
    base,
    equity,
    signon,
    bonus,
    total: base + equity + signon + bonus,
    location: offer.location || app.location || app.job?.location || '—',
    start: offer.startDate || app.startDate || '—',
    pto: offer.pto || '—',
    deadlineDays: offer.deadlineDays ?? app.deadlineDays ?? null,
  };
};

export default function AppOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyOffers();
        if (cancelled) return;
        const list = res?.offers || res?.applications || (Array.isArray(res) ? res : []);
        setOffers((Array.isArray(list) ? list : []).map(fromApplication));
      } catch (err) {
        if (!cancelled) setError(err || new Error('Could not load your offers'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const best = useMemo(
    () => (offers.length ? Math.max(...offers.map((o) => o.total)) : 0),
    [offers],
  );

  /* v3's side-by-side table is two columns wide, so it compares the first two
     offers. With one offer the second column is simply absent rather than
     padded with an em dash pretending to be a rival. */
  const [a, b] = offers;
  const compareRows = useMemo(() => {
    if (!a) return [];
    return [
      { k: 'Base', a: k(a.base), b: b ? k(b.base) : null },
      { k: 'Equity / yr', a: k(a.equity), b: b ? k(b.equity) : null },
      { k: 'Sign-on', a: k(a.signon), b: b ? k(b.signon) : null },
      { k: 'Bonus', a: k(a.bonus), b: b ? k(b.bonus) : null },
      { k: 'Total', a: k(a.total), b: b ? k(b.total) : null },
      { k: 'Location', a: a.location, b: b ? b.location : null },
      { k: 'Start', a: a.start, b: b ? b.start : null },
      { k: 'PTO', a: a.pto, b: b ? b.pto : null },
    ];
  }, [a, b]);

  const cols = b ? '1fr 160px 160px' : '1fr 160px';

  return (
    <>
      <Head>
        <title>Offers · Jobocate</title>
      </Head>

      <Screen width={1000}>
        {loading && <LoadingState label="Loading your offers…" />}
        {!loading && error && <ErrorState error={error} onRetry={() => window.location.reload()} />}

        {!loading && !error && offers.length > 0 && (
          <>
            <CellGrid cols={Math.min(offers.length, 2)} style={{ marginBottom: 34 }}>
              {offers.slice(0, 2).map((o) => (
                <div key={o.id} style={{ background: 'var(--jb-v3-panel)', padding: '22px 24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{o.company}</span>
                    {o.deadlineDays != null && (
                      <span style={mono(10, '0.12em', 'var(--jb-v3-accent)')}>
                        Decide in {o.deadlineDays}d
                      </span>
                    )}
                  </div>
                  <div style={{ ...mono(10.5, '0'), marginBottom: 18 }}>{o.title}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                    <span
                      style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}
                    >
                      {k(o.base)}
                    </span>
                    <span style={mono(10.5, '0')}>+ {k(o.equity)} equity</span>
                  </div>
                  {/* Bars read this offer's total against the best on the table,
                      so two offers are visually comparable at a glance. */}
                  <Ticks pct={best ? o.total / best : null} n={14} height={12} grow />
                </div>
              ))}
            </CellGrid>

            <Label>Side by side</Label>
            {compareRows.map((r) => (
              <div
                key={r.k}
                style={{
                  borderTop: HAIR,
                  display: 'grid',
                  gridTemplateColumns: cols,
                  gap: 20,
                  alignItems: 'baseline',
                  padding: '14px 4px',
                }}
              >
                <span style={mono(10, '0.12em')}>{r.k}</span>
                <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 12.5 }}>{r.a}</span>
                {r.b != null && (
                  <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 12.5 }}>{r.b}</span>
                )}
              </div>
            ))}
            <EndRule />
          </>
        )}

        {!loading && !error && offers.length === 0 && (
          <EmptyState
            title="No offers yet"
            hint="When an application reaches an offer it appears here, side by side with the others."
            action={
              <MonoButton href="/app/tracker" style={{ marginTop: 8 }}>
                See applications
              </MonoButton>
            }
          />
        )}
      </Screen>
    </>
  );
}
