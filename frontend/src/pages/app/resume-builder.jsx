'use client';

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { useAuth } from '@/context/AuthContext';
import {
  getResumeBuilderContext,
  getResumeTemplates,
} from '@/services/resumeBuilderApi';

/* ===========================================================================
   STATIC DATA  (ported 1:1 from the DCLogic Component class)
   ========================================================================= */

const TEMPLATE_DATA = [
  { name: 'Classic', twoCol: false, atsScore: 95, recommended: true, tags: ['ATS-safe', '1-page'], thumbHead: '#1B1A16', thumbAlign: 'center' },
  { name: 'Modern', twoCol: true, atsScore: 88, recommended: false, tags: ['Two-column', 'Photo'], thumbHead: '#1FA463', sidebarBg: '#EAF6EE' },
  { name: 'Minimal', twoCol: false, atsScore: 92, recommended: false, tags: ['1-page', 'Minimal'], thumbHead: '#1B1A16', thumbAlign: 'flex-start' },
  { name: 'Technical', twoCol: false, atsScore: 94, recommended: false, tags: ['ATS-safe', 'Skills-grid'], thumbHead: '#157A49', thumbAlign: 'flex-start' },
  { name: 'Executive', twoCol: false, atsScore: 90, recommended: false, tags: ['Serif', 'Senior'], thumbHead: '#1B1A16', thumbAlign: 'center' },
  { name: 'Creative', twoCol: true, atsScore: 82, recommended: false, tags: ['Photo', 'Colorful'], thumbHead: '#C9622E', sidebarBg: '#F7ECE3' },
];

const ACCENT_DATA = [
  { key: 'green', label: 'Green', hex: '#1FA463', tint: '#EAF6EE', rule: '#CDE9D6' },
  { key: 'ink', label: 'Ink', hex: '#1B1A16', tint: '#EDEAE2', rule: '#DED7C9' },
  { key: 'clay', label: 'Clay', hex: '#C9622E', tint: '#F7ECE3', rule: '#EAD6C7' },
  { key: 'navy', label: 'Navy', hex: '#2A4A6B', tint: '#E8EEF5', rule: '#D2DDEB' },
];

const FONT_PAIR_DATA = [
  { key: 'serif', label: 'Serif', note: 'Instrument Serif', family: "'Instrument Serif',serif", weight: 400, nameWeight: 400, headWeight: 400 },
  { key: 'sans', label: 'Sans', note: 'Hanken Grotesk', family: "'Hanken Grotesk',sans-serif", weight: 800, nameWeight: 800, headWeight: 700 },
];

const SOURCE_RAW = [
  { glyph: '👤', iconBg: '#EAF6EE', iconColor: '#157A49', title: 'Use my Jobocate profile', desc: 'Auto-fill from your saved experience, skills and links. Fastest path — ready in seconds.', recommended: true },
  { glyph: '↑', iconBg: '#F2ECE0', iconColor: '#5A544A', title: 'Upload existing résumé', desc: 'Drop a PDF or DOCX and we’ll parse it into editable sections.', recommended: false, drop: true },
  { glyph: '✎', iconBg: '#F2ECE0', iconColor: '#5A544A', title: 'Start from scratch', desc: 'Begin with a blank document and the structure of your chosen template.', recommended: false },
];

const STEP_TITLES = ['Template', 'Starting point', 'Style'];

const HEADS = [
  { t: 'Choose a template', s: 'Pick a layout — every one is recruiter-ready and exports clean.' },
  { t: 'Where should we start?', s: 'We can pre-fill everything from what we already know about you.' },
  { t: 'Make it yours', s: 'Tune the accent, headline font and density. The preview updates live.' },
];

// Design sample fallback (the page always renders faithfully with this).
const SAMPLE_PREVIEW = {
  name: 'Sarah Chen',
  title: 'Senior Product Designer',
  summary:
    'Senior product designer with seven years shaping 0→1 fintech and B2B SaaS products. I pair design-systems thinking with a bias for shipping tested, data-backed work.',
  contactLine: 'sarah.chen@gmail.com · San Francisco, CA · sarahchen.design',
  contactLines: ['sarah.chen@gmail.com', 'San Francisco, CA', 'sarahchen.design'],
  experience: [
    {
      role: 'Senior Product Designer',
      org: 'Plaid',
      dates: '2021 — Present',
      bullets: [
        'Led the onboarding redesign that lifted activation +31% across 2M users.',
        'Built the design system adopted by 40+ engineers across six product teams.',
      ],
    },
    {
      role: 'Product Designer',
      org: 'Square',
      dates: '2018 — 2021',
      bullets: [
        'Shipped the seller dashboard used daily by 200k+ merchants.',
        'Ran the research program that informed the 2020 product roadmap.',
      ],
    },
  ],
  skills: ['Design systems', 'Prototyping', 'User research', 'Figma', 'Interaction design', 'Design ops'],
  eduSchool: 'Carnegie Mellon University',
  eduDegree: 'BFA, Communication Design',
  eduDates: '2014',
};

/* ===========================================================================
   PAGE
   ========================================================================= */

export default function AppResumeBuilder() {
  const { user } = useAuth() || {};

  // ---- configurator state (ported from DCLogic state) ----
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState(0);
  const [startSource, setStartSource] = useState(0);
  const [accent, setAccent] = useState(0);
  const [fontPair, setFontPair] = useState(0);
  const [density, setDensity] = useState('comfortable');

  // ---- backend-seeded preview content (graceful fallback to sample) ----
  const [templates, setTemplates] = useState(TEMPLATE_DATA);
  const [preview, setPreview] = useState(SAMPLE_PREVIEW);

  useEffect(() => {
    let cancelled = false;

    // Template catalogue — merge onto baked-in list so we always have 6 cards.
    getResumeTemplates()
      .then((res) => {
        if (cancelled) return;
        const remote = Array.isArray(res) ? res : res?.templates;
        if (!Array.isArray(remote) || remote.length === 0) return;
        setTemplates((prev) =>
          prev.map((t, i) => {
            const match =
              remote.find(
                (r) => (r.key || r.name)?.toLowerCase() === t.name.toLowerCase()
              ) || remote[i];
            if (!match) return t;
            return {
              ...t,
              name: match.name || t.name,
              twoCol: typeof match.twoCol === 'boolean' ? match.twoCol : t.twoCol,
              atsScore: match.atsScore ?? t.atsScore,
              tags: Array.isArray(match.tags) ? match.tags : t.tags,
            };
          })
        );
      })
      .catch(() => {
        /* keep baked-in templates */
      });

    // Live-preview seed data from the user's real profile/resume context.
    getResumeBuilderContext()
      .then((res) => {
        if (cancelled) return;
        const ctx = res?.context || res?.resume || res;
        if (!ctx || typeof ctx !== 'object') return;
        setPreview((prev) => ({
          ...prev,
          name: ctx.name || prev.name,
          title: ctx.title || ctx.headline || prev.title,
          summary: ctx.summary || prev.summary,
          contactLine: ctx.contactLine || prev.contactLine,
          contactLines: Array.isArray(ctx.contactLines) ? ctx.contactLines : prev.contactLines,
          experience: Array.isArray(ctx.experience) && ctx.experience.length ? ctx.experience : prev.experience,
          skills: Array.isArray(ctx.skills) && ctx.skills.length ? ctx.skills : prev.skills,
          eduSchool: ctx.eduSchool || prev.eduSchool,
          eduDegree: ctx.eduDegree || prev.eduDegree,
          eduDates: ctx.eduDates || prev.eduDates,
        }));
      })
      .catch(() => {
        /* keep design sample */
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  /* --------------------------------------------------------- derived vals --- */

  const next = () => setStep((s) => Math.min(s + 1, 2));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const stepLabel = `Step ${step + 1} of 3`;
  const isTemplate = step === 0;
  const isSource = step === 1;
  const isStyle = step === 2;
  const canBack = step > 0;
  const notLast = step < 2;
  const isLast = step === 2;

  const steps = STEP_TITLES.map((t, i) => {
    const done = i < step;
    const cur = i === step;
    return {
      title: t,
      mark: done ? '✓' : String(i + 1),
      numColor: cur ? '#0C2C1C' : done ? '#fff' : '#9A9286',
      numBg: cur || done ? '#1FA463' : '#FFFEFB',
      numBorder: cur || done ? '#1FA463' : '#D2C9B7',
      txtColor: cur || done ? '#1B1A16' : '#9A9286',
      connector: i < STEP_TITLES.length - 1,
    };
  });

  const templateCards = templates.map((t, i) => {
    const on = template === i;
    return {
      ...t,
      single: !t.twoCol,
      selected: on,
      sidebarBg: t.sidebarBg || '#F2ECE0',
      thumbAlign: t.thumbAlign || 'flex-start',
      bg: '#FFFEFB',
      border: on ? '#1FA463' : '#E6DECF',
      ring: on ? '0 0 0 3px rgba(31,164,99,0.18)' : 'none',
      atsColor: t.atsScore >= 92 ? '#157A49' : t.atsScore >= 86 ? '#8A8378' : '#C9622E',
    };
  });

  const sources = SOURCE_RAW.map((o, i) => {
    const on = startSource === i;
    return {
      ...o,
      selected: on,
      unselected: !on,
      bg: on ? '#EAF6EE' : o.drop ? '#FBF8F1' : '#FFFEFB',
      border: on ? '#1FA463' : o.drop ? '#D2C9B7' : '#E6DECF',
      borderStyle: o.drop && !on ? 'dashed' : 'solid',
      ring: on ? '0 0 0 3px rgba(31,164,99,0.16)' : 'none',
    };
  });

  const accents = ACCENT_DATA.map((a, i) => {
    const on = accent === i;
    return {
      ...a,
      check: on ? '✓' : '',
      ring: on ? `0 0 0 3px #F7F3EA, 0 0 0 5px ${a.hex}` : 'inset 0 0 0 1px rgba(0,0,0,0.06)',
      labelColor: on ? '#1B1A16' : '#8A8378',
    };
  });

  const fontPairs = FONT_PAIR_DATA.map((f, i) => {
    const on = fontPair === i;
    return {
      ...f,
      selected: on,
      bg: on ? '#EAF6EE' : '#FFFEFB',
      border: on ? '#1FA463' : '#E6DECF',
      ring: on ? '0 0 0 3px rgba(31,164,99,0.16)' : 'none',
    };
  });

  const densities = [
    { key: 'compact', label: 'Compact' },
    { key: 'comfortable', label: 'Comfortable' },
  ].map((d) => {
    const on = density === d.key;
    return {
      ...d,
      color: on ? '#1B1A16' : '#8A8378',
      bg: on ? '#FFFEFB' : 'transparent',
      shadow: on ? '0 1px 3px rgba(27,26,22,0.12)' : 'none',
    };
  });

  // ---- live preview computed style tokens ----
  const acc = ACCENT_DATA[accent];
  const fp = FONT_PAIR_DATA[fontPair];
  const tpl = templates[template];
  const comfy = density === 'comfortable';

  const pv = useMemo(
    () => ({
      accent: acc.hex,
      tint: acc.tint,
      rule: acc.rule,
      headFont: fp.family,
      nameWeight: fp.nameWeight,
      headWeight: fp.headWeight,
      pad: comfy ? 34 : 26,
      gap: comfy ? 16 : 11,
      name: comfy ? 27 : 24,
      nameBig: comfy ? 31 : 27,
      title: comfy ? 12.5 : 11,
      body: comfy ? 10 : 9,
      head: comfy ? 10.5 : 9.5,
      lh: comfy ? 1.62 : 1.46,
      headerAlign: tpl.name === 'Minimal' ? 'left' : 'center',
    }),
    [acc, fp, comfy, tpl.name]
  );

  const initials = (preview.name || 'Sarah Chen')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  /* --------------------------------------------------------------- render --- */

  const sectionHead = (label, extra = {}) => ({
    fontFamily: pv.headFont,
    fontWeight: pv.headWeight,
    fontSize: pv.head,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: pv.accent,
    ...extra,
  });

  return (
    <>
      <Head>
        <title>Resume builder — Jobocate</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        #jbrb ::-webkit-scrollbar {
          width: 8px;
        }
        #jbrb ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbrb button {
          font-family: inherit;
        }
        @keyframes rbpop {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div id="jbrb" style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: "'Hanken Grotesk',sans-serif", color: '#1B1A16' }}>
        <AppSidebar active="resume" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 18, padding: '15px 32px', background: 'rgba(247,243,234,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #E7E0D2' }}>
            <Link href={appRoute('App Resume.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: '#5A544A', textDecoration: 'none' }}>← Back to Resume</Link>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: '#9A9286' }}>{stepLabel}</span>
          </header>

          <div style={{ display: 'flex', gap: 40, padding: '30px 32px 64px', maxWidth: 1180, width: '100%', margin: '0 auto', alignItems: 'flex-start' }}>
            {/* ===== LEFT: CONFIGURATOR ===== */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1FA463', marginBottom: 8 }}>Resume builder</div>
                <h1 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 34, lineHeight: 1.04, margin: '0 0 4px' }}>{HEADS[step].t}</h1>
                <p style={{ fontSize: 14, color: '#8A8378', margin: 0 }}>{HEADS[step].s}</p>
              </div>

              {/* STEPPER */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '24px 0 26px' }}>
                {steps.map((s) => (
                  <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: s.numColor, background: s.numBg, border: `1.5px solid ${s.numBorder}` }}>{s.mark}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: s.txtColor }}>{s.title}</span>
                    {s.connector && <span style={{ width: 34, height: 1.5, background: '#D2C9B7', margin: '0 12px' }} />}
                  </div>
                ))}
              </div>

              {/* STEP 1: TEMPLATE */}
              {isTemplate && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {templateCards.map((t, i) => (
                    <button key={t.name} onClick={() => setTemplate(i)} style={{ position: 'relative', textAlign: 'left', padding: 14, background: t.bg, border: `1.5px solid ${t.border}`, boxShadow: t.ring, borderRadius: 16, cursor: 'pointer' }}>
                      {t.recommended && <span style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>RECOMMENDED</span>}
                      {t.selected && <span style={{ position: 'absolute', top: 11, left: 11, zIndex: 2, width: 22, height: 22, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✓</span>}

                      {/* MINI THUMBNAIL */}
                      <div style={{ height: 150, background: '#FFFFFF', border: '1px solid #ECE6DA', borderRadius: 9, overflow: 'hidden', marginBottom: 12 }}>
                        {t.twoCol ? (
                          <div style={{ display: 'flex', height: '100%' }}>
                            <div style={{ width: '34%', background: t.sidebarBg, padding: '11px 9px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                              <span style={{ width: 26, height: 26, borderRadius: '50%', background: t.thumbHead }} />
                              <span style={{ width: '80%', height: 5, borderRadius: 3, background: t.thumbHead, opacity: 0.55 }} />
                              <span style={{ width: '60%', height: 4, borderRadius: 2, background: '#C9BFAC' }} />
                              <span style={{ width: '70%', height: 4, borderRadius: 2, background: '#C9BFAC' }} />
                              <span style={{ width: '55%', height: 4, borderRadius: 2, background: '#C9BFAC', marginTop: 6 }} />
                              <span style={{ width: '65%', height: 4, borderRadius: 2, background: '#C9BFAC' }} />
                            </div>
                            <div style={{ flex: 1, padding: '12px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={{ width: '70%', height: 9, borderRadius: 3, background: t.thumbHead }} />
                              <span style={{ width: '45%', height: 4, borderRadius: 2, background: '#C9BFAC', marginBottom: 4 }} />
                              <span style={{ width: '38%', height: 5, borderRadius: 2, background: t.thumbHead, opacity: 0.55 }} />
                              <span style={{ width: '95%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                              <span style={{ width: '88%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                              <span style={{ width: '38%', height: 5, borderRadius: 2, background: t.thumbHead, opacity: 0.55, marginTop: 5 }} />
                              <span style={{ width: '92%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                              <span style={{ width: '80%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: t.thumbAlign }}>
                            <span style={{ width: '52%', height: 10, borderRadius: 3, background: t.thumbHead }} />
                            <span style={{ width: '34%', height: 4, borderRadius: 2, background: '#C9BFAC', marginBottom: 5 }} />
                            <span style={{ alignSelf: 'stretch', height: 1, background: '#ECE6DA' }} />
                            <span style={{ width: '30%', height: 5, borderRadius: 2, background: t.thumbHead, opacity: 0.55, alignSelf: 'flex-start', marginTop: 3 }} />
                            <span style={{ width: '96%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                            <span style={{ width: '90%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                            <span style={{ width: '30%', height: 5, borderRadius: 2, background: t.thumbHead, opacity: 0.55, alignSelf: 'flex-start', marginTop: 5 }} />
                            <span style={{ width: '94%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                            <span style={{ width: '86%', height: 4, borderRadius: 2, background: '#E4DDCE' }} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#1B1A16' }}>{t.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 600, color: t.atsColor }}>ATS {t.atsScore}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {t.tags.map((tag) => (
                          <span key={tag} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '0.03em', color: '#5A544A', background: '#F2ECE0', border: '1px solid #E6DECF', padding: '3px 8px', borderRadius: 999 }}>{tag}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: STARTING POINT */}
              {isSource && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {sources.map((o, i) => (
                    <button key={o.title} onClick={() => setStartSource(i)} style={{ position: 'relative', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 16, background: o.bg, border: `1.5px solid ${o.border}`, borderStyle: o.borderStyle, boxShadow: o.ring, borderRadius: 16, padding: '20px 22px', cursor: 'pointer' }}>
                      <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: o.iconBg, color: o.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{o.glyph}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: '#1B1A16' }}>{o.title}</span>
                          {o.recommended && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, color: '#157A49', background: '#EAF6EE', border: '1px solid #CDE9D6', padding: '3px 8px', borderRadius: 999 }}>RECOMMENDED</span>}
                        </span>
                        <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.5, color: '#8A8378' }}>{o.desc}</span>
                      </span>
                      {o.selected ? (
                        <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✓</span>
                      ) : (
                        <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: '1.5px solid #D2C9B7' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 3: STYLE */}
              {isStyle && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Accent color */}
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Accent color</div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {accents.map((a, i) => (
                        <button key={a.key} onClick={() => setAccent(i)} title={a.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <span style={{ width: 46, height: 46, borderRadius: '50%', background: a.hex, boxShadow: a.ring, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>{a.check}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: a.labelColor }}>{a.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Headline font */}
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Headline font</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                      {fontPairs.map((f, i) => (
                        <button key={f.key} onClick={() => setFontPair(i)} style={{ position: 'relative', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 15, background: f.bg, border: `1.5px solid ${f.border}`, boxShadow: f.ring, borderRadius: 14, padding: '16px 18px', cursor: 'pointer' }}>
                          <span style={{ fontFamily: f.family, fontWeight: f.weight, fontSize: 30, lineHeight: 1, color: '#1B1A16' }}>Aa</span>
                          <span>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{f.label}</span>
                            <span style={{ display: 'block', fontSize: 12, color: '#8A8378' }}>{f.note}</span>
                          </span>
                          {f.selected && <span style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderRadius: '50%', background: '#1FA463', color: '#0C2C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Density */}
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 12 }}>Density</div>
                    <div style={{ display: 'inline-flex', padding: 4, background: '#F2ECE0', border: '1px solid #E6DECF', borderRadius: 999, gap: 4 }}>
                      {densities.map((d) => (
                        <button key={d.key} onClick={() => setDensity(d.key)} style={{ fontSize: 13.5, fontWeight: 600, color: d.color, background: d.bg, border: 'none', borderRadius: 999, padding: '9px 22px', cursor: 'pointer', boxShadow: d.shadow }}>{d.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* NAV */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
                {canBack && (
                  <button onClick={back} style={{ fontSize: 14.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '13px 22px', cursor: 'pointer' }}>← Back</button>
                )}
                <div style={{ flex: 1 }} />
                {notLast && (
                  <button onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '14px 26px', cursor: 'pointer' }}>Continue <span>→</span></button>
                )}
                {isLast && (
                  <Link href={appRoute('App Resume.dc.html')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 15, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', borderRadius: 999, padding: '14px 26px', textDecoration: 'none' }}>Open in editor <span>→</span></Link>
                )}
              </div>
            </div>

            {/* ===== RIGHT: LIVE PREVIEW ===== */}
            <div style={{ width: 460, flexShrink: 0, position: 'sticky', top: 88 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9286' }}>Live preview</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#5A544A' }}>{tpl.name} · <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#157A49' }}>ATS {tpl.atsScore}</span></span>
              </div>

              <div
                key={`${template}-${accent}-${fontPair}-${density}`}
                style={{ background: '#FFFEFB', border: '1px solid #E6DECF', boxShadow: '0 26px 56px -30px rgba(27,26,22,0.45)', borderRadius: 4, width: '100%', minHeight: 632, overflow: 'hidden', padding: pv.pad, fontFamily: "'Hanken Grotesk',sans-serif", animation: 'rbpop 0.25s ease' }}
              >
                {/* TWO-COLUMN LAYOUT */}
                {tpl.twoCol ? (
                  <div style={{ display: 'flex', gap: pv.gap }}>
                    <div style={{ width: '36%', flexShrink: 0, background: pv.tint, borderRadius: 4, padding: '16px 13px', display: 'flex', flexDirection: 'column', gap: pv.gap }}>
                      <span style={{ width: 48, height: 48, borderRadius: '50%', background: pv.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, margin: '0 auto' }}>{initials}</span>
                      <div>
                        <div style={sectionHead('Contact', { paddingBottom: 5, marginBottom: 7, borderBottom: `1px solid ${pv.rule}` })}>Contact</div>
                        {preview.contactLines.map((c, i) => (
                          <div key={i} style={{ fontSize: pv.body, lineHeight: 1.65, color: '#3A352C' }}>{c}</div>
                        ))}
                      </div>
                      <div>
                        <div style={sectionHead('Skills', { paddingBottom: 5, marginBottom: 7, borderBottom: `1px solid ${pv.rule}` })}>Skills</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {preview.skills.map((sk) => (
                            <span key={sk} style={{ fontSize: pv.body, color: '#3A352C', background: '#FFFFFF', border: `1px solid ${pv.rule}`, padding: '2px 7px', borderRadius: 999 }}>{sk}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={sectionHead('Education', { paddingBottom: 5, marginBottom: 7, borderBottom: `1px solid ${pv.rule}` })}>Education</div>
                        <div style={{ fontSize: pv.body, fontWeight: 700, color: '#1B1A16' }}>{preview.eduSchool}</div>
                        <div style={{ fontSize: pv.body, color: '#3A352C' }}>{preview.eduDegree}</div>
                        <div style={{ fontSize: pv.body, color: '#8A8378' }}>{preview.eduDates}</div>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: pv.gap }}>
                      <div>
                        <div style={{ fontFamily: pv.headFont, fontWeight: pv.nameWeight, fontSize: pv.name, lineHeight: 1.05, color: '#1B1A16' }}>{preview.name}</div>
                        <div style={{ fontSize: pv.title, fontWeight: 600, color: pv.accent, marginTop: 3 }}>{preview.title}</div>
                      </div>
                      <div>
                        <div style={sectionHead('Summary', { paddingBottom: 5, marginBottom: 7, borderBottom: `1px solid ${pv.rule}` })}>Summary</div>
                        <p style={{ fontSize: pv.body, lineHeight: pv.lh, color: '#3A352C', margin: 0 }}>{preview.summary}</p>
                      </div>
                      <div>
                        <div style={sectionHead('Experience', { paddingBottom: 5, marginBottom: 9, borderBottom: `1px solid ${pv.rule}` })}>Experience</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: pv.gap }}>
                          {preview.experience.map((x, i) => (
                            <div key={i}>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: pv.body, fontWeight: 700, color: '#1B1A16' }}>{x.role} · <span style={{ color: pv.accent }}>{x.org}</span></span>
                                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: pv.body, color: '#8A8378', flexShrink: 0 }}>{x.dates}</span>
                              </div>
                              <ul style={{ margin: '5px 0 0', paddingLeft: 14 }}>
                                {x.bullets.map((b, j) => (
                                  <li key={j} style={{ fontSize: pv.body, lineHeight: pv.lh, color: '#3A352C', marginBottom: 2 }}>{b}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SINGLE-COLUMN LAYOUT */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: pv.gap }}>
                    <div style={{ textAlign: pv.headerAlign }}>
                      <div style={{ fontFamily: pv.headFont, fontWeight: pv.nameWeight, fontSize: pv.nameBig, lineHeight: 1.02, color: '#1B1A16' }}>{preview.name}</div>
                      <div style={{ fontSize: pv.title, fontWeight: 600, letterSpacing: '0.02em', color: pv.accent, marginTop: 4 }}>{preview.title}</div>
                      <div style={{ fontSize: pv.body, color: '#8A8378', marginTop: 6 }}>{preview.contactLine}</div>
                    </div>
                    <span style={{ height: 2, background: pv.accent, borderRadius: 2 }} />
                    <div>
                      <div style={sectionHead('Summary', { letterSpacing: '0.1em', marginBottom: 6 })}>Summary</div>
                      <p style={{ fontSize: pv.body, lineHeight: pv.lh, color: '#3A352C', margin: 0 }}>{preview.summary}</p>
                    </div>
                    <div>
                      <div style={sectionHead('Experience', { letterSpacing: '0.1em', marginBottom: 9 })}>Experience</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: pv.gap }}>
                        {preview.experience.map((x, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontSize: pv.body, fontWeight: 700, color: '#1B1A16' }}>{x.role} · <span style={{ color: pv.accent }}>{x.org}</span></span>
                              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: pv.body, color: '#8A8378', flexShrink: 0 }}>{x.dates}</span>
                            </div>
                            <ul style={{ margin: '5px 0 0', paddingLeft: 15 }}>
                              {x.bullets.map((b, j) => (
                                <li key={j} style={{ fontSize: pv.body, lineHeight: pv.lh, color: '#3A352C', marginBottom: 2 }}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: pv.gap }}>
                      <div style={{ flex: 1 }}>
                        <div style={sectionHead('Skills', { letterSpacing: '0.1em', marginBottom: 7 })}>Skills</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {preview.skills.map((sk) => (
                            <span key={sk} style={{ fontSize: pv.body, color: '#3A352C', background: pv.tint, border: `1px solid ${pv.rule}`, padding: '2px 8px', borderRadius: 999 }}>{sk}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={sectionHead('Education', { letterSpacing: '0.1em', marginBottom: 7 })}>Education</div>
                        <div style={{ fontSize: pv.body, fontWeight: 700, color: '#1B1A16' }}>{preview.eduSchool}</div>
                        <div style={{ fontSize: pv.body, color: '#3A352C' }}>{preview.eduDegree}</div>
                        <div style={{ fontSize: pv.body, color: '#8A8378' }}>{preview.eduDates}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
