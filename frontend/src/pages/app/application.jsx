'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getApplicationById, getApplicationActivity } from '@/services/applicationApi';

/* -------------------------------------------------------------------------- */
/* DESIGN SAMPLE DATA — ported verbatim from the dc Component.renderVals().    */
/* Used as the always-render fallback when unauthenticated or the request      */
/* fails, so the screen looks pixel-faithful regardless of backend state.      */
/* -------------------------------------------------------------------------- */

const SAMPLE = {
  company: 'Stripe',
  companyInitials: 'St',
  role: 'Senior Product Designer',
  statusLabel: 'Interviewing',
  location: 'Remote (US)',
  salary: '$170–210k',
  appliedLabel: 'Applied Jun 18',
  nextStep: {
    title: 'Final round interview',
    when: 'Mon, Jun 29 · 2:00 PM PT',
    detail: '90-min onsite loop · portfolio + 2 craft',
  },
  recruiter: { initials: 'DW', name: 'Dana Whitfield', org: 'Recruiting · Stripe' },
  timeline: [
    { title: 'Applied', date: 'Jun 18', state: 'done' },
    { title: 'In review', date: 'Jun 20', state: 'done', detail: 'Stripe’s team reviewed your application and résumé.' },
    { title: 'Recruiter screen', date: 'Jun 24', state: 'done', detail: '30-min intro call with Dana Whitfield — passed.' },
    { title: 'Final round interview', date: 'Mon, Jun 29 · 2:00 PM PT', state: 'current', detail: '90-minute onsite loop: portfolio walkthrough + two craft sessions.' },
    { title: 'Decision', date: 'Expected by Jul 3', state: 'future' },
  ],
  materials: [
    { tag: 'RB', name: 'Sarah Chen — Product Design (tailored)', meta: 'ATS 92 · tuned for Stripe', href: appRoute('App Resume.dc.html'), iconBg: '#EAF6EE', iconColor: '#157A49' },
    { tag: 'CL', name: 'Cover letter — personalized draft', meta: 'Generated Jun 18 · edited', href: appRoute('App Cover Letter.dc.html'), iconBg: '#F4EFE4', iconColor: '#5A544A' },
  ],
  system: [
    { text: 'Final round scheduled for Mon, Jun 29 · 2:00 PM PT.', time: 'Jun 26', tone: 'green' },
    { text: 'Recruiter screen with Dana Whitfield completed.', time: 'Jun 24', tone: 'green' },
    { text: 'Marcus added this role to your mock-interview prep.', time: 'Jun 23', tone: 'mint' },
    { text: 'Stripe viewed your application.', time: 'Jun 20', tone: 'neutral' },
    { text: 'You applied to Stripe via Jobocate.', time: 'Jun 18', tone: 'neutral' },
  ],
};

/* ---- tone → activity dot styling (ported from dc toneStyle) -------------- */
function toneStyle(tone) {
  if (tone === 'green') return { dotBg: '#1FA463', dotBorder: '#1FA463', icon: '✓', iconColor: '#0C2C1C', textColor: '#3A352C' };
  if (tone === 'mint') return { dotBg: '#1E2D24', dotBorder: '#1E2D24', icon: '✦', iconColor: '#5BD08C', textColor: '#3A352C' };
  if (tone === 'note') return { dotBg: '#FBEDE4', dotBorder: '#EAD0C4', icon: '✎', iconColor: '#C9622E', textColor: '#1B1A16' };
  return { dotBg: '#F2ECE0', dotBorder: '#E1D9C9', icon: '•', iconColor: '#A79E8F', textColor: '#5A544A' };
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
      dotBg: done ? '#1FA463' : '#FFFEFB',
      dotBorder: done ? '#1FA463' : cur ? '#1FA463' : '#D2C9B7',
      dotRing: cur ? '0 0 0 4px rgba(31,164,99,0.18)' : 'none',
      markColor: done ? '#0C2C1C' : '#1FA463',
      lineColor: done ? '#CDE9D6' : '#E6DECF',
      titleWeight: cur ? 700 : done ? 600 : 500,
      titleColor: t.state === 'future' ? '#A79E8F' : '#1B1A16',
      dateColor: cur ? '#157A49' : t.state === 'future' ? '#B5AC9C' : '#8A8378',
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
  if (!app) return SAMPLE;

  const company =
    app.company?.name || app.companyName || app.job?.company?.name || app.job?.company || SAMPLE.company;
  const role = app.job?.title || app.jobTitle || app.role || app.position || SAMPLE.role;
  const companyInitials = company
    ? company.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')
    : SAMPLE.companyInitials;

  // Timeline: prefer a backend stages/timeline array, else fall back to sample.
  let timelineRaw = SAMPLE.timeline;
  const stages = app.timeline || app.stages || app.pipeline;
  if (Array.isArray(stages) && stages.length) {
    timelineRaw = stages.map((s) => ({
      title: s.title || s.label || s.name || s.status || 'Stage',
      date: s.date || s.dateLabel || s.at || '',
      state: s.state || STATE_FROM_STATUS(s.status),
      detail: s.detail || s.description || undefined,
    }));
  }

  // Activity: prefer real events, else fall back to sample system events.
  let system = SAMPLE.system;
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
          iconBg: m.type === 'cover_letter' ? '#F4EFE4' : '#EAF6EE',
          iconColor: m.type === 'cover_letter' ? '#5A544A' : '#157A49',
        }))
      : SAMPLE.materials;

  return {
    company,
    companyInitials: companyInitials || SAMPLE.companyInitials,
    role,
    statusLabel: app.statusLabel || app.stage || SAMPLE.statusLabel,
    location: app.job?.location || app.location || SAMPLE.location,
    salary: app.job?.salary || app.salary || SAMPLE.salary,
    appliedLabel: app.appliedLabel || (app.appliedAt ? `Applied ${app.appliedAt}` : SAMPLE.appliedLabel),
    nextStep: app.nextStep || SAMPLE.nextStep,
    recruiter: app.recruiter || SAMPLE.recruiter,
    timeline: timelineRaw,
    materials,
    system,
  };
}

/* -------------------------------------------------------------------------- */

export default function AppApplicationDetail() {
  const router = useRouter();

  const [model, setModel] = useState(SAMPLE);
  const [loading, setLoading] = useState(true);
  const [withdrawn, setWithdrawn] = useState(false);

  // Activity & notes state (ported from dc Component.state)
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState([]); // user notes, newest first

  // Load real data with graceful fallback to SAMPLE.
  useEffect(() => {
    let cancelled = false;
    const id = router.query?.id || router.query?.applicationId;

    async function load() {
      // Without an id (or token) we still render the faithful sample.
      if (!id) {
        if (!cancelled) setLoading(false);
        return;
      }
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

        if (app) {
          setModel(mapApplication(app, Array.isArray(events) ? events : null));
        }
      } catch {
        // keep SAMPLE — never crash
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

  const timeline = useMemo(() => buildTimeline(model.timeline), [model.timeline]);

  // Merge user notes (newest first) ahead of system events, then derive styling.
  const activity = useMemo(() => {
    const merged = notes
      .map((n) => ({ text: n.text, time: n.time, tone: 'note' }))
      .concat(model.system);
    return merged.map((a, i) => ({
      ...toneStyle(a.tone),
      text: a.text,
      time: a.time,
      connector: i < merged.length - 1,
    }));
  }, [notes, model.system]);

  const withdrawLabel = withdrawn ? 'Application withdrawn' : 'Withdraw application';

  const cardLg = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 26 };
  const cardSm = { background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, padding: 20 };
  const railLabel = {
    fontFamily: "'JetBrains Mono',monospace",
    fontSize: 10.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#9A9286',
    marginBottom: 14,
  };

  return (
    <>
      <Head>
        <title>{model.role} · {model.company} — Jobocate</title>
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
        #jbapp textarea:focus,
        #jbapp input:focus {
          outline: none;
          border-color: #1fa463;
          box-shadow: 0 0 0 3px rgba(31, 164, 99, 0.15);
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
          border-color: #1fa463 !important;
        }
        #jbapp button.jb-addnote:hover {
          background: #1b9159 !important;
        }
        #jbapp a.jb-prep:hover {
          background: #2a2820 !important;
        }
        #jbapp button.jb-withdraw:hover {
          color: #c9622e !important;
        }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: "'Hanken Grotesk',sans-serif",
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="tracker" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <Link
              href={appRoute('App Tracker.dc.html')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}
            >
              ← Back to tracker
            </Link>
            <div style={{ flex: 1 }} />
            <button
              className="jb-withdraw"
              onClick={() => setWithdrawn(true)}
              style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#A79E8F', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {withdrawLabel}
            </button>
          </header>

          <div style={{ padding: '30px 32px 64px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
            {/* ROLE HEADER */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 28 }}>
              <Link
                href={appRoute('App Company.dc.html')}
                style={{
                  width: 62,
                  height: 62,
                  flexShrink: 0,
                  borderRadius: 15,
                  background: '#EAF6EE',
                  color: '#157A49',
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
                  <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 33, lineHeight: 1, margin: 0 }}>{model.role}</h1>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#157A49',
                      background: '#EAF6EE',
                      border: '1px solid #CDE9D6',
                      padding: '5px 11px',
                      borderRadius: 999,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1FA463' }} />
                    {model.statusLabel}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: '#5A544A' }}>
                  <Link href={appRoute('App Company.dc.html')} style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>
                    {model.company}
                  </Link>{' '}
                  · {model.location} · <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>{model.salary}</span> · {model.appliedLabel}
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
                                  fontFamily: "'JetBrains Mono',monospace",
                                  fontSize: 9.5,
                                  fontWeight: 600,
                                  letterSpacing: '0.04em',
                                  color: '#0C2C1C',
                                  background: '#1FA463',
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                }}
                              >
                                UP NEXT
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: t.dateColor, marginTop: 3 }}>{t.date}</div>
                          {t.detail && <div style={{ fontSize: 13, lineHeight: 1.5, color: '#5A544A', marginTop: 6 }}>{t.detailText}</div>}
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
                        color: '#1B1A16',
                        background: '#FBF8F1',
                        border: '1px solid #E1D9C9',
                        borderRadius: 11,
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
                        color: '#0C2C1C',
                        background: '#1FA463',
                        border: 'none',
                        borderRadius: 11,
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
                              fontSize: 9,
                              color: a.iconColor,
                            }}
                          >
                            {a.icon}
                          </span>
                          {a.connector && <span style={{ width: 2, flex: 1, minHeight: 18, background: '#EFE8DA' }} />}
                        </div>
                        <div style={{ paddingBottom: 16, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: a.textColor }}>{a.text}</div>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#A79E8F', marginTop: 3 }}>{a.time}</div>
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
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 11,
                      padding: 14,
                      background: '#EAF6EE',
                      border: '1px solid #CDE9D6',
                      borderRadius: 13,
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ color: '#157A49', flexShrink: 0, fontSize: 15 }}>◷</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1F4733' }}>{model.nextStep.title}</div>
                      <div style={{ fontSize: 13, color: '#1F4733', marginTop: 2 }}>{model.nextStep.when}</div>
                      <div style={{ fontSize: 12, color: '#5BA46F', marginTop: 2 }}>{model.nextStep.detail}</div>
                    </div>
                  </div>
                  <Link
                    href={appRoute('App Interview.dc.html')}
                    className="jb-prep"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: '#1B1A16',
                      color: '#F7F3EA',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: 12,
                      borderRadius: 11,
                      textDecoration: 'none',
                      marginBottom: 16,
                    }}
                  >
                    ✦ Prep with AI →
                  </Link>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingTop: 16, borderTop: '1px solid #F2ECE0' }}>
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: '#EAF6EE',
                        color: '#157A49',
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
                      <div style={{ fontSize: 12, color: '#8A8378' }}>{model.recruiter.org}</div>
                    </div>
                    <Link
                      href={appRoute('App Messages.dc.html')}
                      title="Message"
                      style={{
                        flexShrink: 0,
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#157A49',
                        textDecoration: 'none',
                        border: '1px solid #CDE9D6',
                        background: '#EAF6EE',
                        padding: '7px 11px',
                        borderRadius: 999,
                      }}
                    >
                      Message
                    </Link>
                  </div>
                </div>

                {/* SUBMITTED MATERIALS */}
                <div style={cardSm}>
                  <div style={railLabel}>Submitted materials</div>
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
                          background: '#FBF8F1',
                          border: '1px solid #E6DECF',
                          borderRadius: 12,
                          textDecoration: 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            flexShrink: 0,
                            borderRadius: 9,
                            background: m.iconBg,
                            color: m.iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {m.tag}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B1A16' }}>{m.name}</div>
                          <div style={{ fontSize: 12, color: '#8A8378' }}>{m.meta}</div>
                        </div>
                        <span style={{ color: '#A79E8F', fontSize: 13, flexShrink: 0 }}>↗</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
