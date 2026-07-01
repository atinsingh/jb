'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import {
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from '@/services/paymentMethodsApi';

// ---- Design's own sample data (fallback when unauthenticated / request fails)
const SAMPLE_CARDS = [
  { id: 'c1', brand: 'Visa', brandShort: 'VISA', last4: '4242', exp: '09/27', chipBg: 'linear-gradient(135deg,#1FA463,#157A49)' },
  { id: 'c2', brand: 'Mastercard', brandShort: 'MC', last4: '8819', exp: '03/26', chipBg: 'linear-gradient(135deg,#C9622E,#9A4A22)' },
];
const SAMPLE_DEFAULT = 'c1';

// Brand → chip gradient mapping for cards returned by the backend.
const chipForBrand = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('master')) return 'linear-gradient(135deg,#C9622E,#9A4A22)';
  if (b.includes('amex') || b.includes('american')) return 'linear-gradient(135deg,#15140F,#3A372E)';
  return 'linear-gradient(135deg,#1FA463,#157A49)';
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

  const [cards, setCards] = useState(SAMPLE_CARDS);
  const [defaultId, setDefaultId] = useState(SAMPLE_DEFAULT);
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [nextId, setNextId] = useState(3);
  const [loading, setLoading] = useState(false);

  // Fetch real cards; gracefully fall back to the design's sample data.
  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) return;
    setLoading(true);
    getPaymentMethods()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.paymentMethods || data?.cards || [];
        if (!list.length) return; // keep sample data so the page always renders
        const normalized = list.map(normalizeCard);
        setCards(normalized);
        const def = normalized.find((c) => c.isDefault);
        setDefaultId(def ? def.id : normalized[0].id);
      })
      .catch(() => {
        /* keep sample data — never crash */
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
    const card = { id, brand: 'Visa', brandShort: 'VISA', last4: '0005', exp: '12/29', chipBg: 'linear-gradient(135deg,#1FA463,#157A49)' };
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
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 14,
    color: '#1B1A16',
    background: '#FBF8F1',
    border: '1px solid #E1D9C9',
    borderRadius: 12,
    padding: '12px 14px',
  };
  const label = { fontSize: 12, fontWeight: 600, color: '#46413A', marginBottom: 6, display: 'block' };

  return (
    <>
      <Head>
        <title>Payment methods — Jobocate</title>
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
        #jbapp input::placeholder {
          color: #a79e8f;
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

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="settings" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('App Settings.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to settings</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>Plan &amp; billing</span>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
            <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 38, lineHeight: 1, margin: '0 0 6px' }}>Payment methods</h1>
            <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 24px' }}>Cards on file for your subscription. Your default is charged automatically.</p>

            {/* CARD LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {cards.map((c) => {
                const isDefault = c.id === defaultId;
                const confirming = confirmId === c.id;
                const border = isDefault ? '#CDE9D6' : '#E6DECF';
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#FFFEFB', border: `1px solid ${border}`, borderRadius: 16, padding: '18px 20px' }}>
                    <span style={{ width: 50, height: 34, flexShrink: 0, borderRadius: 7, background: c.chipBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 11, letterSpacing: '0.04em' }}>{c.brandShort}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14.5, fontWeight: 600, color: '#1B1A16' }}>•••• {c.last4}</span>
                        {isDefault && (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>DEFAULT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#8A8378', marginTop: 2 }}>{c.brand} · expires {c.exp}</div>
                    </div>

                    {confirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontSize: 13, color: '#7A4326' }}>Remove?</span>
                        <button onClick={() => doRemove(c.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#C9622E', border: 'none', borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>Remove</button>
                        <button onClick={cancelRemove} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {!isDefault && (
                          <button onClick={() => makeDefault(c.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#157A49', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 10px' }}>Set default</button>
                        )}
                        <button onClick={() => askRemove(c.id)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#A79E8F', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 10px' }}>Remove</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ADD PAYMENT METHOD */}
            {!adding && (
              <button onClick={startAdd} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: '#FBF8F1', border: '1.5px dashed #D2C9B7', borderRadius: 16, padding: 18, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#157A49' }}>+ Add payment method</button>
            )}

            {adding && (
              <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 24, animation: 'rbpop 0.25s ease' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 16 }}>New card</div>
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
                    <input defaultValue="Sarah Chen" style={{ ...input, fontFamily: 'inherit' }} />
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
                  <button onClick={saveCard} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '12px 24px', cursor: 'pointer' }}>Save card</button>
                  <button onClick={cancelAdd} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#5A544A', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 8px' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
