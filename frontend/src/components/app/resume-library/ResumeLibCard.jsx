'use client';

import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

/* --------------------------------------------------------------------------
   ResumeLibCard — faithful React port of ResumeLibCard.dc.html
   Renders one résumé card (thumbnail, title, template/ATS, default/tailored
   chips, edited stamp) plus the per-card "⋯" action menu and the share-link
   "copied" toast. All behaviour (toggle menu / set default / duplicate /
   share / delete) is driven by callbacks passed in on the `item` prop, built
   by the parent page exactly like the dc Component.buildCard().
-------------------------------------------------------------------------- */
export default function ResumeLibCard({ item }) {
  const ACCENT = item.thumbAccent;

  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFEFB',
        border: `1.5px solid ${item.cardBorder}`,
        borderRadius: 16,
        padding: 14,
        fontFamily: "'Hanken Grotesk',sans-serif",
      }}
    >
      {/* THUMBNAIL */}
      <div
        style={{
          height: 150,
          background: '#FFFFFF',
          border: '1px solid #ECE6DA',
          borderRadius: 9,
          overflow: 'hidden',
          marginBottom: 13,
        }}
      >
        <div style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ width: '52%', height: 10, borderRadius: 3, background: ACCENT }} />
          <span style={{ width: '36%', height: 4, borderRadius: 2, background: '#C9BFAC', marginBottom: 5 }} />
          <span style={{ alignSelf: 'stretch', height: 1, background: '#ECE6DA' }} />
          <span style={{ width: '30%', height: 5, borderRadius: 2, background: ACCENT, opacity: 0.55, marginTop: 3 }} />
          <span style={{ width: '96%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
          <span style={{ width: '90%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
          <span style={{ width: '30%', height: 5, borderRadius: 2, background: ACCENT, opacity: 0.55, marginTop: 5 }} />
          <span style={{ width: '94%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
          <span style={{ width: '84%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
        </div>
      </div>

      {/* TITLE ROW */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.25, color: '#1B1A16' }}>{item.name}</span>
        <button
          onClick={item.toggleMenu}
          title="More"
          className="rlc-more"
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            border: '1px solid #E6DECF',
            background: '#FFFEFB',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#8A8378',
            fontSize: 14,
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >
          ⋯
        </button>
      </div>

      <div style={{ fontSize: 12.5, color: '#8A8378', marginBottom: 14 }}>
        {item.template} ·{' '}
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: item.atsColor }}>ATS {item.ats}</span>
      </div>

      {/* BOTTOM ROW */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {item.isDefault && (
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 9px', borderRadius: 999 }}>DEFAULT</span>
        )}
        {item.tailored && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#5A544A', background: '#F4EFE4', border: '1px solid #E6DECF', padding: '3px 9px', borderRadius: 999 }}>◆ {item.tag}</span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A79E8F' }}>{item.edited}</span>
      </div>

      {/* COPIED TOAST */}
      {item.copied && (
        <div style={{ position: 'absolute', top: 14, left: 14, right: 48, display: 'flex', alignItems: 'center', gap: 7, background: '#1FA463', color: '#0C2C1C', borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 600, zIndex: 30 }}>
          ✓ Share link copied
        </div>
      )}

      {/* MENU */}
      {item.menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 14,
            zIndex: 50,
            width: 188,
            background: '#FFFEFB',
            border: '1px solid #E1D9C9',
            borderRadius: 12,
            boxShadow: '0 20px 50px -20px rgba(27,26,22,0.4)',
            overflow: 'hidden',
            padding: 6,
            animation: 'rbpop 0.16s ease',
          }}
        >
          <Link href={appRoute('App Resume.dc.html')} className="rlc-mi" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#1B1A16', textDecoration: 'none' }}>
            <span style={{ color: '#8A8378', width: 16 }}>✎</span>Edit
          </Link>
          <Link href={appRoute('App Resume Generate.dc.html')} className="rlc-mi" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#1B1A16', textDecoration: 'none' }}>
            <span style={{ color: '#157A49', width: 16 }}>✦</span>Tailor for a role
          </Link>
          <button onClick={item.duplicate} className="rlc-mi" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#1B1A16', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ color: '#8A8378', width: 16 }}>⧉</span>Duplicate
          </button>
          {item.notDefault && (
            <button onClick={item.setDefault} className="rlc-mi" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#1B1A16', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ color: '#8A8378', width: 16 }}>★</span>Set as default
            </button>
          )}
          <button onClick={item.share} className="rlc-mi" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#1B1A16', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ color: '#8A8378', width: 16 }}>↗</span>Share link
          </button>
          <div style={{ height: 1, background: '#F2ECE0', margin: '5px 4px' }} />
          <button onClick={item.del} className="rlc-mi-danger" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#C9622E', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ width: 16 }}>✕</span>Delete
          </button>
        </div>
      )}
    </div>
  );
}
