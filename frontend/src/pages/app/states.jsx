'use client';

import Head from 'next/head';
import Link from 'next/link';
import { appRoute } from '@/components/app/appRoutes';

/* ---------------------------------------------------------------- skeleton row --- */
const shimmer = {
  background: 'linear-gradient(90deg,var(--jb-v3-line) 25%,var(--jb-v3-bg) 50%,var(--jb-v3-line) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.3s ease-in-out infinite',
};

function SkeletonRow({ widths }) {
  return (
    <div
      style={{
        background: 'var(--jb-v3-panel)',
        border: '1px solid var(--jb-v3-line)',
        borderRadius: 2,
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <span style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 2, ...shimmer }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <span style={{ height: 13, width: widths[0], borderRadius: 2, ...shimmer }} />
        <span style={{ height: 11, width: widths[1], borderRadius: 2, ...shimmer }} />
        <span style={{ height: 11, width: widths[2], borderRadius: 2, ...shimmer }} />
      </div>
      <span style={{ width: 80, height: 36, flexShrink: 0, borderRadius: 2, ...shimmer }} />
    </div>
  );
}

function SectionLabel({ tag, tagColor, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
      <span
        style={{
          fontFamily: 'var(--jb-v3-font-mono)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: tagColor,
        }}
      >
        {tag}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--jb-v3-fg-3)' }}>{note}</span>
    </div>
  );
}

export default function AppStates() {
  return (
    <>
      <Head>
        <title>App states · Reusable patterns — Jobocate</title>
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
          background: 'var(--jb-v3-bg)',
          fontFamily: 'var(--jb-v3-font-display)',
          color: 'var(--jb-v3-fg)',
          padding: '40px 32px 72px',
        }}
      >
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <span
              style={{
                fontFamily: 'var(--jb-v3-font-display)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontSize: 23,
                color: 'var(--jb-v3-fg)',
              }}
            >
              Jobocate<span style={{ color: 'var(--jb-v3-accent)' }}>.</span>
            </span>
            <span
              style={{
                fontFamily: 'var(--jb-v3-font-mono)',
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--jb-v3-fg-3)',
              }}
            >
              / App states
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--jb-v3-font-display)',
              fontWeight: 400,
              fontSize: 38,
              lineHeight: 1.02,
              margin: '0 0 6px',
            }}
          >
            Reusable states
          </h1>
          <p style={{ fontSize: 15, color: 'var(--jb-v3-fg-2)', margin: '0 0 32px' }}>
            A reference sheet of shared patterns. Lift any block straight into a screen.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {/* 404 */}
            <div>
              <SectionLabel tag="404" tagColor="var(--jb-v3-accent)" note="Page not found" />
              <div
                style={{
                  background: 'var(--jb-v3-panel)',
                  border: '1px solid var(--jb-v3-line)',
                  borderRadius: 2,
                  padding: '48px 30px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--jb-v3-font-display)',
                    fontSize: 88,
                    lineHeight: 1,
                    color: 'var(--jb-v3-accent)',
                    marginBottom: 8,
                    animation: 'floaty 4s ease-in-out infinite',
                  }}
                >
                  404
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--jb-v3-font-display)',
                    fontWeight: 400,
                    fontSize: 30,
                    lineHeight: 1.05,
                    margin: '0 0 8px',
                  }}
                >
                  This page wandered off.
                </h2>
                <p style={{ fontSize: 14.5, color: 'var(--jb-v3-fg-2)', margin: '0 auto 24px', maxWidth: 380 }}>
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
                      background: 'var(--jb-v3-accent)',
                      color: 'var(--jb-v3-accent-ink)',
                      fontSize: 14.5,
                      fontWeight: 700,
                      padding: '13px 22px',
                      borderRadius: 2,
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
                      background: 'var(--jb-v3-panel)',
                      color: 'var(--jb-v3-fg)',
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: '13px 22px',
                      borderRadius: 2,
                      textDecoration: 'none',
                      border: '1px solid var(--jb-v3-line-2)',
                    }}
                  >
                    Visit help center
                  </Link>
                </div>
              </div>
            </div>

            {/* GENERIC ERROR */}
            <div>
              <SectionLabel tag="Error" tagColor="var(--jb-v3-danger)" note="Unexpected failure · retry" />
              <div
                style={{
                  background: 'var(--jb-v3-panel)',
                  border: '1px solid var(--jb-v3-line)',
                  borderRadius: 2,
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
                    background: 'var(--jb-v3-danger-soft)',
                    color: 'var(--jb-v3-danger)',
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
                    fontFamily: 'var(--jb-v3-font-display)',
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: 1.05,
                    margin: '0 0 8px',
                  }}
                >
                  Something broke.
                </h2>
                <p style={{ fontSize: 14.5, color: 'var(--jb-v3-fg-2)', margin: '0 auto 24px', maxWidth: 380 }}>
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
                      background: 'var(--jb-v3-fg)',
                      color: 'var(--jb-v3-bg)',
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: '13px 22px',
                      borderRadius: 2,
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
                      background: 'var(--jb-v3-panel)',
                      color: 'var(--jb-v3-fg)',
                      fontSize: 14.5,
                      fontWeight: 600,
                      padding: '13px 22px',
                      borderRadius: 2,
                      textDecoration: 'none',
                      border: '1px solid var(--jb-v3-line-2)',
                    }}
                  >
                    Contact support
                  </Link>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--jb-v3-font-mono)',
                    fontSize: 11,
                    color: 'var(--jb-v3-fg-3)',
                    marginTop: 18,
                  }}
                >
                  Error ref · JB-5XX-20260629
                </div>
              </div>
            </div>

            {/* EMPTY LIST */}
            <div>
              <SectionLabel tag="Empty" tagColor="var(--jb-v3-fg-3)" note="No items yet · first-run" />
              <div
                style={{
                  background: 'var(--jb-v3-panel)',
                  border: '1px dashed var(--jb-v3-line-2)',
                  borderRadius: 2,
                  padding: '44px 30px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 120,
                    height: 84,
                    margin: '0 auto 22px',
                    borderRadius: 2,
                    background:
                      'repeating-linear-gradient(45deg, var(--jb-v3-control), var(--jb-v3-control) 9px, var(--jb-v3-line) 9px, var(--jb-v3-line) 18px)',
                    border: '1px solid var(--jb-v3-line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--jb-v3-font-mono)',
                      fontSize: 11,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--jb-v3-fg-3)',
                    }}
                  >
                    illustration
                  </span>
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--jb-v3-font-display)',
                    fontWeight: 400,
                    fontSize: 26,
                    lineHeight: 1.1,
                    margin: '0 0 8px',
                  }}
                >
                  Nothing here yet.
                </h2>
                <p style={{ fontSize: 14.5, color: 'var(--jb-v3-fg-3)', margin: '0 auto 22px', maxWidth: 360 }}>
                  Bookmark roles from your matches and they&rsquo;ll collect here for later.
                </p>
                <Link
                  href={appRoute('App Matches.dc.html')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--jb-v3-accent)',
                    color: 'var(--jb-v3-accent-ink)',
                    fontSize: 14.5,
                    fontWeight: 700,
                    padding: '13px 22px',
                    borderRadius: 2,
                    textDecoration: 'none',
                  }}
                >
                  Browse matches →
                </Link>
              </div>
            </div>

            {/* BANNERS */}
            <div>
              <SectionLabel tag="Banner" tagColor="var(--jb-v3-danger)" note="Offline · maintenance" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    background: 'var(--jb-v3-danger-soft)',
                    border: '1px solid var(--jb-v3-danger-line)',
                    borderRadius: 2,
                    padding: '14px 18px',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: 'var(--jb-v3-danger)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    ⚠
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--jb-v3-danger)' }}>
                    <b>You&rsquo;re offline.</b> Changes are saved locally and will sync the moment you reconnect.
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--jb-v3-font-mono)',
                      fontSize: 11,
                      color: 'var(--jb-v3-warn)',
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
                    background: 'var(--jb-v3-invert)',
                    border: '1px solid var(--jb-v3-fg)',
                    borderRadius: 2,
                    padding: '14px 18px',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: 'var(--jb-v3-ok)',
                      color: 'var(--jb-v3-accent-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    ◷
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, color: 'var(--jb-v3-line)' }}>
                    <b style={{ color: 'var(--jb-v3-panel)' }}>Scheduled maintenance.</b> Auto-Apply is paused while we ship an update —
                    back by 2:00 AM PT.
                  </span>
                  <Link
                    href={appRoute('App Help Center.dc.html')}
                    style={{
                      fontFamily: 'var(--jb-v3-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--jb-v3-ok)',
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
              <SectionLabel tag="Loading" tagColor="var(--jb-v3-fg-3)" note="Skeleton · match card" />
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
