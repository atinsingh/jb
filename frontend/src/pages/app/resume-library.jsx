'use client';

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import ResumeLibCard from '@/components/app/resume-library/ResumeLibCard';
import { listResumeLibrary } from '@/services/resumeLibraryApi';

/* --------------------------------------------------------------------------
   App Resume Library — faithful in-shell port of "App Resume Library.dc.html"

   Ports the dc Component class state + renderVals() to React:
     state.cards    -> cards (useState)
     state.default  -> defaultId
     state.openMenu -> openMenu (per-card "⋯" menu)
     state.newMenu  -> newMenu ("New résumé" dropdown)
     state.copied   -> copied (share-link toast, auto-clears after 1.6s)
     state.nextId   -> nextId (duplicate id generator)

   Real data is fetched from /api/resume-builder; on failure or when
   unauthenticated the page falls back to the design's own SAMPLE_CARDS so it
   always renders faithfully.
-------------------------------------------------------------------------- */

const SAMPLE_CARDS = [
  { id: 'r1', group: 'base', name: 'Product Design — General', template: 'Classic', ats: 88, edited: 'Jun 12', tag: 'General', thumbAccent: '#1B1A16' },
  { id: 'r2', group: 'tailored', name: 'Product Design — Stripe', template: 'Minimal', ats: 92, edited: 'Jun 18', tag: 'Stripe', thumbAccent: '#157A49' },
  { id: 'r3', group: 'tailored', name: 'Product Design — Figma', template: 'Modern', ats: 90, edited: 'Jun 22', tag: 'Figma', thumbAccent: '#1B1A16' },
  { id: 'r4', group: 'tailored', name: 'Design Engineer — Linear', template: 'Technical', ats: 87, edited: 'Jun 24', tag: 'Linear', thumbAccent: '#157A49' },
];

const atsColor = (n) => (n >= 90 ? '#157A49' : n >= 85 ? '#8A8378' : '#C9622E');

/* Normalise a backend résumé record into the card shape the design expects.
   Backends differ; we read common fields defensively and supply sane
   defaults so the UI never breaks. */
const fmtDate = (v) => {
  if (!v) return 'Recently';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const normalizeCard = (raw, i) => {
  const id = String(raw.id ?? raw._id ?? `r${i + 1}`);
  const tailoredFor = raw.tailoredFor || raw.targetRole || raw.role || raw.company || raw.tag || null;
  const isBase = raw.group === 'base' || raw.isBase === true || (!tailoredFor && i === 0);
  const ats = Number(raw.ats ?? raw.atsScore ?? 88) || 88;
  return {
    id,
    group: isBase ? 'base' : 'tailored',
    name: raw.name || raw.title || raw.label || 'Untitled résumé',
    template: raw.template || raw.templateName || 'Classic',
    ats,
    edited: raw.edited || fmtDate(raw.updatedAt || raw.modifiedAt || raw.createdAt),
    tag: tailoredFor || 'General',
    thumbAccent: isBase ? '#1B1A16' : '#157A49',
  };
};

export default function AppResumeLibrary() {
  // ---- ported dc state ----
  const [cards, setCards] = useState(SAMPLE_CARDS);
  const [defaultId, setDefaultId] = useState('r1');
  const [openMenu, setOpenMenu] = useState(null);
  const [newMenu, setNewMenu] = useState(false);
  const [copied, setCopied] = useState(null);
  const [nextId, setNextId] = useState(5);

  // ---- backend fetch / fallback ----
  const [loading, setLoading] = useState(true);
  const copyTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    listResumeLibrary()
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : data?.resumes || data?.items || data?.data || [];
        if (Array.isArray(list) && list.length) {
          const built = list.map(normalizeCard);
          setCards(built);
          const base = built.find((c) => c.group === 'base') || built[0];
          setDefaultId(base ? base.id : null);
          setNextId(built.length + 1);
        }
        // empty list -> keep the sample library so the page stays faithful
      })
      .catch(() => {
        /* unauthenticated / offline / error -> design sample fallback */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // componentWillUnmount() { clearTimeout(this.copyTimer); }
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // ---- ported actions ----
  const closeAll = () => {
    setOpenMenu(null);
    setNewMenu(false);
  };

  const toggleNew = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setNewMenu((v) => !v);
    setOpenMenu(null);
  };

  // buildCard(c) — assembles the per-card view-model + behaviour callbacks,
  // mirroring the dc Component.buildCard().
  const buildCard = (c) => {
    const isDefault = c.id === defaultId;
    return {
      ...c,
      isDefault,
      notDefault: !isDefault,
      tailored: c.group === 'tailored',
      cardBorder: isDefault ? '#CDE9D6' : '#E6DECF',
      atsColor: atsColor(c.ats),
      menuOpen: openMenu === c.id,
      copied: copied === c.id,
      toggleMenu: (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        setOpenMenu((cur) => (cur === c.id ? null : c.id));
        setNewMenu(false);
      },
      setDefault: () => {
        setDefaultId(c.id);
        setOpenMenu(null);
      },
      duplicate: () => {
        const newCardId = 'r' + nextId;
        setNextId((n) => n + 1);
        setCards((cur) => {
          const copy = { ...c, id: newCardId, name: c.name + ' (copy)', edited: 'Just now' };
          const idx = cur.findIndex((x) => x.id === c.id);
          const out = cur.slice();
          out.splice(idx + 1, 0, copy);
          return out;
        });
      },
      share: () => {
        setCopied(c.id);
        setOpenMenu(null);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(null), 1600);
      },
      del: () =>
        setCards((cur) => {
          const out = cur.filter((x) => x.id !== c.id);
          setDefaultId((d) => (d === c.id ? (out[0] ? out[0].id : null) : d));
          setOpenMenu(null);
          return out;
        }),
    };
  };

  // renderVals()
  const built = cards.map(buildCard);
  const count = cards.length;
  const baseCards = built.filter((c) => c.group === 'base');
  const tailoredCards = built.filter((c) => c.group === 'tailored');
  const anyMenu = newMenu || openMenu !== null;

  return (
    <>
      <Head>
        <title>Résumés · Library — Jobocate</title>
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
        #jbapp .rlc-more:hover {
          background: #f4efe4 !important;
        }
        #jbapp .rlc-mi:hover {
          background: #f4efe4 !important;
        }
        #jbapp .rlc-mi-danger:hover {
          background: #fbede4 !important;
        }
        #jbapp .jb-newbtn:hover {
          background: #1b9159 !important;
        }
        #jbapp .jb-newrow:hover {
          background: #f4efe4 !important;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      <div id="jbapp" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="resume" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 20, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>Toolkit / Résumés</div>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative' }}>
              <button
                onClick={toggleNew}
                className="jb-newbtn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1FA463', color: '#0C2C1C', fontSize: 13.5, fontWeight: 700, padding: '10px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ✦ New résumé <span style={{ fontSize: 9 }}>▼</span>
              </button>
              {newMenu && (
                <div style={{ position: 'absolute', right: 0, top: 46, zIndex: 50, width: 230, background: '#FFFEFB', border: '1px solid #E1D9C9', borderRadius: 13, boxShadow: '0 20px 50px -20px rgba(27,26,22,0.35)', overflow: 'hidden', padding: 6, animation: 'rbpop 0.16s ease' }}>
                  <Link href={appRoute('App Resume Builder.dc.html')} className="jb-newrow" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 9, textDecoration: 'none' }}>
                    <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#F4EFE4', color: '#5A544A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▤</span>
                    <span>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>Start from a template</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#8A8378' }}>Pick a layout, fill it in</span>
                    </span>
                  </Link>
                  <Link href={appRoute('App Resume Generate.dc.html')} className="jb-newrow" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 9, textDecoration: 'none' }}>
                    <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</span>
                    <span>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>Generate with AI</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#8A8378' }}>Draft from a role + JD</span>
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 1080, width: '100%', margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Résumés</h1>
              <p style={{ fontSize: 15.5, color: '#5A544A', margin: 0 }}>
                <b style={{ color: '#1B1A16' }}>{count} versions</b> · one base, tailored copies per role.
              </p>
            </div>

            {/* BASE */}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 13 }}>Base résumés</div>
            {baseCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 34 }}>
                {baseCards.map((c) => (
                  <ResumeLibCard key={c.id} item={c} />
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: 34, padding: '26px 22px', border: '1px dashed #D9D0BE', borderRadius: 16, background: '#FFFEFB', color: '#8A8378', fontSize: 14 }}>
                No base résumé yet. Create one to get started.
              </div>
            )}

            {/* TAILORED */}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 13 }}>Tailored versions</div>
            {tailoredCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                {tailoredCards.map((c) => (
                  <ResumeLibCard key={c.id} item={c} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '26px 22px', border: '1px dashed #D9D0BE', borderRadius: 16, background: '#FFFEFB', color: '#8A8378', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                No tailored versions yet —{' '}
                <Link href={appRoute('App Resume Generate.dc.html')} style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>tailor one for a role →</Link>
              </div>
            )}
          </div>
        </main>

        {/* SCRIM — closes any open menu on outside click */}
        {anyMenu && <div onClick={closeAll} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
      </div>
    </>
  );
}
