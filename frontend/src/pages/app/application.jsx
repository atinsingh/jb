'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppTopNav from '@/components/app/AppTopNav';
import { appRoute } from '@/components/app/appRoutes';
import { LoadingState, EmptyState, ErrorState } from '@/components/app/AppStates';
import { getApplicationById, getApplicationActivity } from '@/services/applicationApi';

/* ---- tone → activity dot styling (ported from dc toneStyle) -------------- */
function toneStyle(tone) {
  if (tone === 'green') return { dotBg: 'var(--jb-v3-accent)', dotBorder: 'var(--jb-v3-accent)', icon: '✓', iconColor: 'var(--jb-v3-accent-ink)', textColor: 'var(--jb-v3-fg-2)' };
  if (tone === 'mint') return { dotBg: 'var(--jb-v3-ok)', dotBorder: 'var(--jb-v3-ok)', icon: '✦', iconColor: 'var(--jb-v3-ok)', textColor: 'var(--jb-v3-fg-2)' };
  if (tone === 'note') return { dotBg: 'var(--jb-v3-danger-soft)', dotBorder: 'var(--jb-v3-danger-line)', icon: '✎', iconColor: 'var(--jb-v3-danger)', textColor: 'var(--jb-v3-fg)' };
  return { dotBg: 'var(--jb-v3-control)', dotBorder: 'var(--jb-v3-line)', icon: '•', iconColor: 'var(--jb-v3-fg-3)', textColor: 'var(--jb-v3-fg-2)' };
}

/* ---- timeline row → derived visual props (ported from dc map) ------------ */
function buildTimeline(raw) {
  return raw.map((t, i) => {
    const done = t.state === 'done';
    const cur = t.state === 'current';
    return {
      title: t.title,
      date: t.date,
      connector: i < raw.length - 1,
      pad: i < raw.length - 1 ? '24px' : '0',
      mark: done ? '✓' : '',
      dotBg: done ? 'var(--jb-v3-accent)' : 'var(--jb-v3-panel)',
      dotBorder: done ? 'var(--jb-v3-accent)' : cur ? 'var(--jb-v3-accent)' : 'var(--jb-v3-line-2)',
      dotRing: cur ? '0 0 0 4px color-mix(in srgb, var(--jb-v3-accent) 18%, transparent)' : 'none',
      markColor: done ? 'var(--jb-v3-accent-ink)' : 'var(--jb-v3-accent)',
      lineColor: done ? 'var(--jb-v3-accent-line)' : 'var(--jb-v3-line)',
      titleWeight: cur ? 700 : done ? 600 : 500,
      titleColor: t.state === 'future' ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg)',
      dateColor: cur ? 'var(--jb-v3-accent)' : t.state === 'future' ? 'var(--jb-v3-fg-3)' : 'var(--jb-v3-fg-3)',
      isCurrent: cur,
      detail: !!t.detail,
      detailText: t.detail || '',
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Backend → sample mapping. Tolerant of unknown shapes; always returns a      */
/* fully-populated model so the screen renders faithfully.                     */
/* -------------------------------------------------------------------------- */

const STATE_FROM_STATUS = (s) => {
  const v = String(s || '').toUpperCase();
  if (['APPLIED', 'SUBMITTED', 'IN_REVIEW', 'REVIEWED', 'SCREEN', 'DONE', 'COMPLETED'].includes(v)) return 'done';
  if (['INTERVIEW', 'INTERVIEWING', 'FINAL', 'CURRENT'].includes(v)) return 'current';
  return 'future';
};

function mapApplication(app, activityEvents) {
  if (!app) return null;

  const company =
    app.company?.name || app.companyName || app.job?.company?.name || app.job?.company || '';
  const role = app.job?.title || app.jobTitle || app.role || app.position || '';
  const companyInitials = company
    ? company.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
    : '';

  // Timeline: from a backend stages/timeline array (empty when none).
  let timelineRaw = [];
  const stages = app.timeline || app.stages || app.pipeline;
  if (Array.isArray(stages) && stages.length) {
    timelineRaw = stages.map((s) => ({
      title: s.title || s.label || s.name || s.status || 'Stage',
      date: s.date || s.dateLabel || s.at || '',
      state: s.state || STATE_FROM_STATUS(s.status),
      detail: s.detail || s.description || undefined,
    }));
  }

  // Activity: real events only (empty when none).
  let system = [];
  if (Array.isArray(activityEvents) && activityEvents.length) {
    system = activityEvents.map((e) => ({
      text: e.text || e.message || e.description || e.title || 'Activity',
      time: e.time || e.dateLabel || e.createdAt || '',
      tone: e.tone || (String(e.type || '').includes('NOTE') ? 'note' : 'neutral'),
    }));
  }

  const materials =
    Array.isArray(app.materials) && app.materials.length
      ? app.materials.map((m) => ({
          tag: m.tag || (m.type === 'cover_letter' ? 'CL' : 'RB'),
          name: m.name || m.title || 'Document',
          meta: m.meta || m.description || '',
          href: m.href || appRoute(m.type === 'cover_letter' ? 'App Cover Letter.dc.html' : 'App Resume.dc.html'),
          iconBg: m.type === 'cover_letter' ? 'var(--jb-v3-control)' : 'var(--jb-v3-accent-soft)',
          iconColor: m.type === 'cover_letter' ? 'var(--jb-v3-fg-2)' : 'var(--jb-v3-accent)',
        }))
      : [];

  return {
    company,
    companyInitials,
    role,
    statusLabel: app.statusLabel || app.stage || '',
    location: app.job?.location || app.location || '',
    salary: app.job?.salary || app.salary || '',
    appliedLabel: app.appliedLabel || (app.appliedAt ? `Applied ${app.appliedAt}` : ''),
    nextStep: app.nextStep || null,
    recruiter: app.recruiter || null,
    timeline: timelineRaw,
    materials,
    system,
  };
}

/* -------------------------------------------------------------------------- */

export default function AppApplicationDetail() {
  const router = useRouter();

  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawn, setWithdrawn] = useState(false);

  // Activity & notes state (ported from dc Component.state)
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState([]); // user notes, newest first

  // Load real data — no sample fallback.
  useEffect(() => {
    let cancelled = false;
    const id = router.query?.id || router.query?.applicationId;

    async function load() {
      if (!id) {
        if (!cancelled) {
          setModel(null);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [appRes, actRes] = await Promise.allSettled([
          getApplicationById(id),
          getApplicationActivity({ applicationId: id, limit: 30 }),
        ]);
        if (cancelled) return;

        const app =
          appRes.status === 'fulfilled'
            ? appRes.value?.application || appRes.value
            : null;
        const events =
          actRes.status === 'fulfilled'
            ? actRes.value?.events || actRes.value?.activity || actRes.value
            : null;

        setModel(app ? mapApplication(app, Array.isArray(events) ? events : null) : null);
      } catch (e) {
        if (!cancelled) {
          setError(e);
          setModel(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (router.isReady) load();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query]);

  const addNote = () => {
    const t = draft.trim();
    if (!t) return;
    setNotes((prev) => [{ text: t, time: 'Just now' }, ...prev]);
    setDraft('');
  };

  const timeline = useMemo(() => buildTimeline(model?.timeline || []), [model]);

  // Merge user notes (newest first) ahead of system events, then derive styling.
  const activity = useMemo(() => {
    const merged = notes
      .map((n) => ({ text: n.text, time: n.time, tone: 'note' }))
      .concat(model?.system || []);
    return merged.map((a, i) => ({
      ...toneStyle(a.tone),
      text: a.text,
      time: a.time,
      connector: i < merged.length - 1,
    }));
  }, [notes, model]);

  const withdrawLabel = withdrawn ? 'Application withdrawn' : 'Withdraw application';

  const cardLg = { background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 26 };
  const cardSm = { background: 'var(--jb-v3-panel)', border: '1px solid var(--jb-v3-line)', borderRadius: 2, padding: 20 };
  const railLabel = {
    fontFamily: 'var(--jb-v3-font-mono)',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--jb-v3-fg-3)',
    marginBottom: 14,
  };

  return (
    <>
      <Head>
        <title>{model ? `${model.role} · ${model.company} — Jobocate` : 'Application — Jobocate'}</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: var(--jb-v3-line);
          border-radius: 2px;
        }
        #jbapp textarea:focus,
        #jbapp input:focus {
          outline: none;
          border-color: var(--jb-v3-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--jb-v3-accent) 15%, transparent);
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        #jbapp a.jb-material:hover {
          border-color: var(--jb-v3-accent) !important;
        }
        #jbapp button.jb-addnote:hover {
          background: var(--jb-v3-ok) !important;
        }
        #jbapp a.jb-prep:hover {
          background: var(--jb-v3-invert) !important;
        }
        #jbapp button.jb-withdraw:hover {
          color: var(--jb-v3-danger) !important;
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          minHeight: '100vh',
          background: 'var(--jb-v3-bg)',
          fontFamily: 'var(--jb-v3-font-display)',
          color: 'var(--jb-v3-fg)',
        }}
      >
        <AppTopNav />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'relative',
              
              
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'color-mix(in srgb, var(--jb-v3-bg) 85%, transparent)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid var(--jb-v3-line)',
            }}
          >
            <Link
              href={appRoute('App Tracker.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg-2)', textDecoration: 'none' }}
            >
              ← Back to tracker
            </Link>
            <div style={{ flex: 1 }} />
            <button
              className="jb-withdraw"
              onClick={() => setWithdrawn(true)}
              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--jb-v3-fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {withdrawLabel}
            </button>
          </header>

          {loading ? (
            <LoadingState label="Loading application…" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => router.reload()} />
          ) : !model ? (
            <EmptyState title="No application to show" hint="Open an application from your tracker to see its status and activity." />
          ) : (
          <div style={{ padding: '30px 32px 64px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
            {/* ROLE HEADER */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 28 }}>
              <Link
                href={appRoute('App Company.dc.html')}
                style={{
                  width: 62,
                  height: 62,
                  flexShrink: 0,
                  borderRadius: 2,
                  background: 'var(--jb-v3-accent-soft)',
                  color: 'var(--jb-v3-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 21,
                  textDecoration: 'none',
                }}
              >
                {model.companyInitials}
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ fontFamily: 'var(--jb-v3-font-display)', fontWeight: 600, letterSpacing: '-0.04em', fontSize: 33, lineHeight: 1, margin: 0 }}>{model.role}</h1>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'var(--jb-v3-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--jb-v3-accent)',
                      background: 'var(--jb-v3-accent-soft)',
                      border: '1px solid var(--jb-v3-accent-line)',
                      padding: '5px 11px',
                      borderRadius: 2,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--jb-v3-accent)' }} />
                    {model.statusLabel}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--jb-v3-fg-2)' }}>
                  <Link href={appRoute('App Company.dc.html')} style={{ color: 'var(--jb-v3-accent)', fontWeight: 600, textDecoration: 'none' }}>
                    {model.company}
                  </Link>{' '}
                  · {model.location} · <span style={{ fontFamily: 'var(--jb-v3-font-mono)', color: 'var(--jb-v3-accent)' }}>{model.salary}</span> · {model.appliedLabel}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
              {/* LEFT: TIMELINE + ACTIVITY */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* TIMELINE */}
                <div style={cardLg}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 22px' }}>Status timeline</h2>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {timeline.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: t.dotBg,
                              border: `2px solid ${t.dotBorder}`,
                              boxShadow: t.dotRing,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: t.markColor,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {t.mark}
                          </span>
                          {t.connector && <span style={{ width: 2, flex: 1, minHeight: 30, background: t.lineColor }} />}
                        </div>
                        <div style={{ paddingBottom: t.pad, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: t.titleWeight, color: t.titleColor }}>{t.title}</span>
                            {t.isCurrent && (
                              <span
                                style={{
                                  fontFamily: 'var(--jb-v3-font-mono)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  letterSpacing: '0.04em',
                                  color: 'var(--jb-v3-accent-ink)',
                                  background: 'var(--jb-v3-accent)',
                                  padding: '3px 8px',
                                  borderRadius: 2,
                                }}
                              >
                                UP NEXT
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: t.dateColor, marginTop: 3 }}>{t.date}</div>
                          {t.detail && <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--jb-v3-fg-2)', marginTop: 6 }}>{t.detailText}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ACTIVITY / NOTES */}
                <div style={cardLg}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 16px' }}>Activity &amp; notes</h2>

                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addNote();
                        }
                      }}
                      placeholder="Add a private note…"
                      style={{
                        flex: 1,
                        fontFamily: 'inherit',
                        fontSize: 14,
                        color: 'var(--jb-v3-fg)',
                        background: 'var(--jb-v3-panel)',
                        border: '1px solid var(--jb-v3-line)',
                        borderRadius: 2,
                        padding: '11px 14px',
                      }}
                    />
                    <button
                      className="jb-addnote"
                      onClick={addNote}
                      style={{
                        flexShrink: 0,
                        fontFamily: 'inherit',
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: 'var(--jb-v3-accent-ink)',
                        background: 'var(--jb-v3-accent)',
                        border: 'none',
                        borderRadius: 2,
                        padding: '11px 18px',
                        cursor: 'pointer',
                      }}
                    >
                      Add note
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activity.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 13, animation: 'rbpop 0.2s ease' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: a.dotBg,
                              border: `1.5px solid ${a.dotBorder}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              color: a.iconColor,
                            }}
                          >
                            {a.icon}
                          </span>
                          {a.connector && <span style={{ width: 2, flex: 1, minHeight: 18, background: 'var(--jb-v3-line)' }} />}
                        </div>
                        <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: a.textColor }}>{a.text}</div>
                          <div style={{ fontFamily: 'var(--jb-v3-font-mono)', fontSize: 11, color: 'var(--jb-v3-fg-3)', marginTop: 3 }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT RAIL */}
              <div style={{ width: 316, flexShrink: 0, position: 'sticky', top: 88, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* RECRUITER & NEXT STEP */}
                <div style={cardSm}>
                  <div style={railLabel}>Next step</div>
                  {model.nextStep ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 11,
                        padding: 14,
                        background: 'var(--jb-v3-accent-soft)',
                        border: '1px solid var(--jb-v3-accent-line)',
                        borderRadius: 2,
                        marginBottom: 16,
                      }}
                    >
                      <span style={{ color: 'var(--jb-v3-accent)', flexShrink: 0, fontSize: 15 }}>◷</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--jb-v3-ok)' }}>{model.nextStep.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--jb-v3-ok)', marginTop: 2 }}>{model.nextStep.when}</div>
                        <div style={{ fontSize: 12, color: 'var(--jb-v3-ok)', marginTop: 2 }}>{model.nextStep.detail}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)', marginBottom: 16 }}>No upcoming step scheduled yet.</div>
                  )}
                  <Link
                    href={appRoute('App Interview.dc.html')}
                    className="jb-prep"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'var(--jb-v3-fg)',
                      color: 'var(--jb-v3-bg)',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: 12,
                      borderRadius: 2,
                      textDecoration: 'none',
                      marginBottom: 16,
                    }}
                  >
                    ✦ Prep with AI →
                  </Link>

                  {model.recruiter && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingTop: 16, borderTop: '1px solid var(--jb-v3-control)' }}>
                      <span
                        style={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          borderRadius: '50%',
                          background: 'var(--jb-v3-accent-soft)',
                          color: 'var(--jb-v3-accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {model.recruiter.initials}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{model.recruiter.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>{model.recruiter.org}</div>
                      </div>
                      <Link
                        href={appRoute('App Messages.dc.html')}
                        title="Message"
                        style={{
                          flexShrink: 0,
                          fontFamily: 'var(--jb-v3-font-mono)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--jb-v3-accent)',
                          textDecoration: 'none',
                          border: '1px solid var(--jb-v3-accent-line)',
                          background: 'var(--jb-v3-accent-soft)',
                          padding: '7px 11px',
                          borderRadius: 2,
                        }}
                      >
                        Message
                      </Link>
                    </div>
                  )}
                </div>

                {/* SUBMITTED MATERIALS */}
                <div style={cardSm}>
                  <div style={railLabel}>Submitted materials</div>
                  {model.materials.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--jb-v3-fg-3)' }}>No documents submitted yet.</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {model.materials.map((m, i) => (
                      <Link
                        key={i}
                        href={m.href}
                        className="jb-material"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 13,
                          background: 'var(--jb-v3-panel)',
                          border: '1px solid var(--jb-v3-line)',
                          borderRadius: 2,
                          textDecoration: 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            flexShrink: 0,
                            borderRadius: 2,
                            background: m.iconBg,
                            color: m.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--jb-v3-font-mono)',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {m.tag}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--jb-v3-fg)' }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--jb-v3-fg-3)' }}>{m.meta}</div>
                        </div>
                        <span style={{ color: 'var(--jb-v3-fg-3)', fontSize: 13, flexShrink: 0 }}>↗</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </main>
      </div>
    </>
  );
}
