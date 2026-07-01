'use client';

import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

/* ---------------------------------------------------------------- skeleton row --- */
const shimmer = {
  background: 'linear-gradient(90deg,#EFE8DA 25%,#F7F3EA 50%,#EFE8DA 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.3s ease-in-out infinite',
};

function SkeletonRow({ widths }) {
  return (
    <div
      style={{
        background: '#FFFEFB',
        border: '1px solid #E6DECF',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 13, ...shimmer }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ height: 13, width: widths[0], borderRadius: 6, ...shimmer }} />
        <span style={{ height: 11, width: widths[1], borderRadius: 6, ...shimmer }} />
        <span style={{ height: 11, width: widths[2], borderRadius: 6, ...shimmer }} />
      </div>
      <span style={{ width: 80, height: 36, flexShrink: 0, borderRadius: 11, ...shimmer }} />
    </div>
  );
}

function SectionLabel({ tag, tagColor, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tagColor,
        }}
      >
        {tag}
      </span>
      <span style={{ fontSize: 12.5, color: '#A79E8F' }}>{note}</span>
    </div>
  );
}

export default function AppStates() {
  return (
    <>
      <Head>
        <title>App states · Reusable patterns — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbstates * {
          box-sizing: border-box;
        }
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes floaty {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>

      <div
        id="jbstates"
        style={{
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
          padding: '40px 32px 72px',
        }}
      >
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontSize: 23,
                color: '#1B1A16',
              }}
            >
              Jobocate<span style={{ color: '#1FA463' }}>.</span>
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#9A9286',
              }}
            >
              / App states
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Instrument Serif',serif",
              fontWeight: 400,
              fontSize: 38,
              lineHeight: 1.02,
              margin: '0 0 6px',
            }}
          >
            Reusable states
          </h1>
          <p style={{ fontSize: 15, color: '#5A544A', margin: '0 0 32px' }}>
            A reference sheet of shared patterns. Lift any block straight into a screen.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {/* 404 */}
            <div>
              <SectionLabel tag="404" tagColor="#1FA463" note="Page not found" />
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 18,
                  padding: '48px 30px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontSize: 88,
                    lineHeight: 1,
                    color: '#1FA463',
                    marginBottom: 8,
                    animation: 'floaty 4s ease-in-out infinite',
                  }}
                >
                  404
                </div>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 30,
                    lineHeight: 1.05,
                    margin: '0 0 8px',
                  }}
                >
                  This page wandered off.
                </h2>
                <p style={{ fontSize: 14.5, color: '#5A544A', margin: '0 auto 24px', maxWidth: 380 }}>
                  We couldn&rsquo;t find that page — it may have moved, or never existed. Your search is still right where you
                  left it.
                </p>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={appRoute('App Dashboard.dc.html')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#1FA463',
                      color: '#0C2C1C',
                      fontSize: 14.5,
                      fontWeight: 700,
                      padding: '13px 22px',
                      borderRadius: 999,
                      textDecoration: 'none',
                    }}
                  >
                    ← Back to dashboard
                  </Link>
                  <Link
                    href={appRoute('App Help Center.dc.html')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: '#FFFEFB',
                      color: '#1B1A16',
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: '13px 22px',
                      borderRadius: 999,
                      textDecoration: 'none',
                      border: '1px solid #D9D0BE',
                    }}
                  >
                    Visit help center
                  </Link>
                </div>
              </div>
            </div>

            {/* GENERIC ERROR */}
            <div>
              <SectionLabel tag="Error" tagColor="#C9622E" note="Unexpected failure · retry" />
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px solid #E6DECF',
                  borderRadius: 18,
                  padding: '44px 30px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    margin: '0 auto 20px',
                    borderRadius: '50%',
                    background: '#FBEDE4',
                    color: '#C9622E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                  }}
                >
                  !
                </div>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.05,
                    margin: '0 0 8px',
                  }}
                >
                  Something broke.
                </h2>
                <p style={{ fontSize: 14.5, color: '#5A544A', margin: '0 auto 24px', maxWidth: 380 }}>
                  An unexpected error happened on our end — not yours. Your data is safe. Give it another try in a moment.
                </p>
                <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: 'inherit',
                      background: '#1B1A16',
                      color: '#F7F3EA',
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: '13px 22px',
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ↻ Try again
                  </button>
                  <Link
                    href={appRoute('App Support.dc.html')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: '#FFFEFB',
                      color: '#1B1A16',
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: '13px 22px',
                      borderRadius: 999,
                      textDecoration: 'none',
                      border: '1px solid #D9D0BE',
                    }}
                  >
                    Contact support
                  </Link>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 10.5,
                    color: '#B5AC9C',
                    marginTop: 18,
                  }}
                >
                  Error ref · JB-5XX-20260629
                </div>
              </div>
            </div>

            {/* EMPTY LIST */}
            <div>
              <SectionLabel tag="Empty" tagColor="#9A9286" note="No items yet · first-run" />
              <div
                style={{
                  background: '#FFFEFB',
                  border: '1px dashed #D2C9B7',
                  borderRadius: 18,
                  padding: '44px 30px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 84,
                    margin: '0 auto 22px',
                    borderRadius: 12,
                    background:
                      'repeating-linear-gradient(45deg, #F4EFE4, #F4EFE4 9px, #EFE8DA 9px, #EFE8DA 18px)',
                    border: '1px solid #E6DECF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 9.5,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#A79E8F',
                    }}
                  >
                    illustration
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontWeight: 400,
                    fontSize: 26,
                    lineHeight: 1.1,
                    margin: '0 0 8px',
                  }}
                >
                  Nothing here yet.
                </h2>
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: '0 auto 22px', maxWidth: 360 }}>
                  Bookmark roles from your matches and they&rsquo;ll collect here for later.
                </p>
                <Link
                  href={appRoute('App Matches.dc.html')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#1FA463',
                    color: '#0C2C1C',
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: '13px 22px',
                    borderRadius: 999,
                    textDecoration: 'none',
                  }}
                >
                  Browse matches →
                </Link>
              </div>
            </div>

            {/* BANNERS */}
            <div>
              <SectionLabel tag="Banner" tagColor="#C9622E" note="Offline · maintenance" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    background: '#FBEDE4',
                    border: '1px solid #EAD0C4',
                    borderRadius: 13,
                    padding: '14px 18px',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: '#C9622E',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    ⚠
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, color: '#7A4326' }}>
                    <b>You&rsquo;re offline.</b> Changes are saved locally and will sync the moment you reconnect.
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10.5,
                      color: '#9A6A2E',
                      flexShrink: 0,
                    }}
                  >
                    RETRYING…
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    background: '#15140F',
                    border: '1px solid #2C2A22',
                    borderRadius: 13,
                    padding: '14px 18px',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: '#1E2D24',
                      color: '#5BD08C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    ◷
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, color: '#E4DECF' }}>
                    <b style={{ color: '#FBF8F1' }}>Scheduled maintenance.</b> Auto-Apply is paused while we ship an update —
                    back by 2:00 AM PT.
                  </span>
                  <Link
                    href={appRoute('App Help Center.dc.html')}
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#5BD08C',
                      textDecoration: 'none',
                      flexShrink: 0,
                    }}
                  >
                    STATUS →
                  </Link>
                </div>
              </div>
            </div>

            {/* LOADING SKELETON */}
            <div>
              <SectionLabel tag="Loading" tagColor="#9A9286" note="Skeleton · match card" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <SkeletonRow widths={['58%', '80%', '40%']} />
                <SkeletonRow widths={['48%', '72%', '34%']} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
