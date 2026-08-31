'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import {
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from '@/services/paymentMethodsApi';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';

// Brand → chip gradient mapping for cards returned by the backend.
const chipForBrand = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('master')) return 'linear-gradient(135deg,var(--jb-v3-danger),var(--jb-v3-warn))';
  if (b.includes('amex') || b.includes('american')) return 'linear-gradient(135deg,var(--jb-v3-invert),var(--jb-v3-invert))';
  return 'linear-gradient(135deg,var(--jb-v3-accent),var(--jb-v3-accent))';
};
const shortForBrand = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('master')) return 'MC';
  if (b.includes('amex') || b.includes('american')) return 'AMEX';
  if (b.includes('visa')) return 'VISA';
  return (brand || 'CARD').slice(0, 4).toUpperCase();
};

const normalizeCard = (raw) => ({
  id: String(raw.id ?? raw._id ?? raw.cardId ?? Math.random().toString(36).slice(2)),
  brand: raw.brand || raw.cardBrand || 'Card',
  brandShort: raw.brandShort || shortForBrand(raw.brand || raw.cardBrand),
  last4: raw.last4 || raw.last4Digits || '0000',
  exp: raw.exp || (raw.expMonth && raw.expYear ? `${String(raw.expMonth).padStart(2, '0')}/${String(raw.expYear).slice(-2)}` : '—'),
  chipBg: raw.chipBg || chipForBrand(raw.brand || raw.cardBrand),
  isDefault: !!raw.isDefault,
});

export default function AppPaymentMethods() {
  const { isAuthenticated } = useAuth() || {};

  const [cards, setCards] = useState([]);
  const [defaultId, setDefaultId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [nextId, setNextId] = useState(3);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the user's real cards. No sample fallback — an authenticated user
  // with no cards on file sees a genuine empty state.
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getPaymentMethods()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.paymentMethods || data?.cards || [];
        const normalized = list.map(normalizeCard);
        setCards(normalized);
        const def = normalized.find((c) => c.isDefault);
        setDefaultId(def ? def.id : normalized[0] ? normalized[0].id : null);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ---- actions (optimistic; best-effort backend sync)
  const makeDefault = (id) => {
    setDefaultId(id);
    if (isAuthenticated) setDefaultPaymentMethod(id).catch(() => {});
  };
  const askRemove = (id) => setConfirmId(id);
  const cancelRemove = () => setConfirmId(null);
  const doRemove = (id) => {
    setCards((prev) => {
      const remaining = prev.filter((x) => x.id !== id);
      setDefaultId((d) => (d === id ? (remaining[0] ? remaining[0].id : null) : d));
      return remaining;
    });
    setConfirmId(null);
    if (isAuthenticated) removePaymentMethod(id).catch(() => {});
  };

  const startAdd = () => setAdding(true);
  const cancelAdd = () => setAdding(false);
  const saveCard = () => {
    const id = 'c' + nextId;
    const card = { id, brand: 'Visa', brandShort: 'VISA', last4: '0005', exp: '12/29', chipBg: 'linear-gradient(135deg,var(--jb-v3-accent),var(--jb-v3-accent))' };
    setCards((prev) => prev.concat(card));
    setNextId((n) => n + 1);
    setAdding(false);
    if (isAuthenticated) {
      addPaymentMethod({ brand: card.brand, last4: card.last4, exp: card.exp })
        .then((created) => {
          if (created) {
            const real = normalizeCard(created.paymentMethod || created.card || created);
            setCards((prev) => prev.map((c) => (c.id === id ? real : c)));
          }
        })
        .catch(() => {});
    }
  };

  const input = {
    width: '100%',
    fontFamily: 'var(--jb-v3-font-mono)',
    fontSize: 14,
    color: 'var(--jb-v3-fg)',
    background: 'var(--jb-v3-panel)',
    border: '1px solid var(--jb-v3-line)',
    borderRadius: 2,
    padding: '12px 14px',
  };
  const label = { fontSize: 12, fontWeight: 600, color: 'var(--jb-v3-fg-2)', marginBottom: 6, display: 'block' };

  return (
    <>
      <Head>
        <title>Payment methods — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp input:focus,
        #jbapp select:focus {
          outline: none;
          border-color: var(--jb-v3-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 15%, transparent);
        }
        #jbapp input::placeholder {
          color: var(--jb-v3-fg-3);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--jb-v3-bg)', fontFamily: 'var(--jb-v3-font-display)', color: 'var(--jb-v3-fg)' }}>
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'relative',   display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--jb-v3-line)' }}>
            <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11.5, color: 'var(--jb-v3-fg-3)' }}>Plan &amp; billing</span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 38, lineHeight: 1, margin: '0 0 6px' }}>Payment methods</h1>
            <p style={{ fontSize: 15, color: 'var(--jb-v3-fg-2)', margin: '0 0 24px' }}>Cards on file for your subscription. Your default is charged automatically.</p>

            {/* CARD LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {loading ? (
                <LoadingState label="Loading payment methods…" />
              ) : error ? (
                <ErrorState error={error} onRetry={() => window.location.reload()} />
              ) : cards.length === 0 ? (
                <EmptyState icon="💳" title="No payment methods" hint="Add a card below to manage your subscription billing." />
              ) : (
                cards.map((c) => {
                const isDefault = c.id === defaultId;
                const confirming = confirmId === c.id;
                const border = isDefault ? 'var(--jb-v3-accent-line)' : 'var(--jb-v3-line)';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--jb-v3-panel)', border: `1px solid ${border}`, borderRadius: 2, padding: '18px 20px' }}>
                    <span style={{ width: 50, height: 34, flexShrink: 0, borderRadius: 2, background: c.chipBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--jb-v3-font-mono)', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em' }}>{c.brandShort}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 14.5, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>•••• {c.last4}</span>
                        {isDefault && (
                          <span style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--jb-v3-accent)', background: 'var(--jb-v3-accent-soft)', border: '1px solid var(--jb-v3-accent-line)', padding: '3px 8px', borderRadius: 2 }}>DEFAULT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)', marginTop: 2 }}>{c.brand} · expires {c.exp}</div>
                    </div>

                    {confirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontSize: 13, color: 'var(--jb-v3-danger)' }}>Remove?</span>
                        <button onClick={() => doRemove(c.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--jb-v3-danger)', border: 'none', borderRadius: 2, padding: '7px 14px', cursor: 'pointer' }}>Remove</button>
                        <button onClick={cancelRemove} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!isDefault && (
                          <button onClick={() => makeDefault(c.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--jb-v3-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 10px' }}>Set default</button>
                        )}
                        <button onClick={() => askRemove(c.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--jb-v3-fg-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 10px' }}>Remove</button>
                      </div>
                    )}
                  </div>
                );
                })
              )}
            </div>

            {/* ADD PAYMENT METHOD */}
            {!adding && (
              <button onClick={startAdd} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: 'var(--jb-v3-panel)', border: '1.5px dashed var(--jb-v3-line-2)', borderRadius: 2, padding: 18, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: 'var(--jb-v3-accent)' }}>+ Add payment method</button>
            )}

            {adding && (
              <div style={{ background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 24, animation: 'rbpop 0.25s ease' }}>
                <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jb-v3-fg-3)', marginBottom: 16 }}>New card</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div>
                    <label style={label}>Card number</label>
                    <input placeholder="1234 1234 1234 1234" style={input} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={label}>Expiry</label>
                      <input placeholder="MM / YY" style={input} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={label}>CVC</label>
                      <input placeholder="CVC" style={input} />
                    </div>
                  </div>
                  <div>
                    <label style={label}>Name on card</label>
                    <input placeholder="Name on card" style={{ ...input, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={label}>Country</label>
                    <select style={{ ...input, fontFamily: 'inherit', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none' }}>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>United Kingdom</option>
                      <option>Germany</option>
                      <option>Australia</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={saveCard} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--jb-v3-accent-ink)', background: 'var(--jb-v3-accent)', border: 'none', borderRadius: 2, padding: '12px 24px', cursor: 'pointer' }}>Save card</button>
                  <button onClick={cancelAdd} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--jb-v3-fg-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 8px' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
