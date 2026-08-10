'use client';

import { useState, useMemo, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppSidebar from '@/components/app/AppSidebar';
import { appRoute } from '@/components/app/appRoutes';
import { getHelpArticles, submitArticleFeedback } from '@/services/helpApi';

// ---- Sample data (the design's own bundled content) ----
const HELP_CATEGORIES = [
  { key: 'start', name: 'Getting started', desc: 'Set up your account and learn the basics.', tag: 'GS', tint: '#EAF6EE', ink: '#157A49' },
  { key: 'matches', name: 'Matches & applications', desc: 'How matching, applying and tracking work.', tag: 'MA', tint: '#F4EFE4', ink: '#5A544A' },
  { key: 'auto', name: 'Auto-Apply', desc: 'Hands-off applying and your weekly credits.', tag: 'AA', tint: '#E6F6EC', ink: '#157A49' },
  { key: 'resume', name: 'Résumé & cover letters', desc: 'Building and tailoring your documents.', tag: 'RC', tint: '#F4EFE4', ink: '#5A544A' },
  { key: 'billing', name: 'Billing & plans', desc: 'Upgrades, invoices, refunds and trials.', tag: 'BP', tint: '#FBEDE4', ink: '#C9622E' },
  { key: 'account', name: 'Account', desc: 'Login, security and notification settings.', tag: 'AC', tint: '#F4EFE4', ink: '#5A544A' },
];

const HELP_ARTICLES = [
  { id: 'gs1', cat: 'start', title: 'How Jobocate works', body: ['Jobocate is an AI copilot for your job search. It builds your résumé, matches you to roles ranked by fit, applies on your behalf, and preps you for interviews — all from one workspace.', 'Start by uploading a résumé or building one. We turn it into a profile that powers everything else: the better your profile, the sharper your matches.', 'From there, review matches daily, let Auto-Apply handle volume, and track every application in your pipeline.'], related: ['gs2', 'm1'] },
  { id: 'gs2', cat: 'start', title: 'Setting up your profile', body: ['Your profile is the source of truth for matching and applications. Add your experience, top skills, target roles, locations and a salary floor.', 'You can edit any field at any time from Settings. Changes take effect on your next batch of matches.', 'Tip: keep your skills specific — “design systems” and “experimentation” match better than broad terms like “design”.'], related: ['m1', 'r1'] },
  { id: 'm1', cat: 'matches', title: 'How match scores are calculated', body: ['Your match score blends role fit, skills overlap, seniority, location and compensation alignment against each posting. A 96% means almost everything lines up.', 'Scores update as you refine your profile and as new signal arrives from the company. Saving or applying to similar roles nudges future matches.', 'Scores are a guide, not a gate — you can apply to any role regardless of its score.'], related: ['m2', 'gs2'] },
  { id: 'm2', cat: 'matches', title: 'Why am I seeing roles outside my filters?', body: ['Occasionally we surface a slightly out-of-filter role when the fit is unusually strong — for example a role $5k below your floor but a 95% skills match.', 'These are always labeled, and you can dismiss them to teach the system your hard limits.', 'To tighten things up, set your filters in Matches and mark a few off-target roles as “not interested”.'], related: ['m1', 'auto1'] },
  { id: 'auto1', cat: 'auto', title: 'What is Auto-Apply?', body: ['Auto-Apply submits applications to your strongest matches automatically, using your selected résumé and a tailored cover letter. You review everything in the tracker.', 'Every submission goes to a verified company careers page — never a third-party board.', 'You stay in control: pause it anytime, set quality thresholds, and approve or undo any application.'], related: ['auto2', 'm1'] },
  { id: 'auto2', cat: 'auto', title: 'Managing your weekly auto-apply credits', body: ['Each plan includes a weekly pool of auto-apply credits. One credit equals one submitted application.', 'Your remaining credits show in the sidebar. Credits reset at the start of each week and do not roll over.', 'Premium includes unlimited auto-apply, so there are no credits to manage.'], related: ['auto1', 'billing1'] },
  { id: 'r1', cat: 'resume', title: 'Building an ATS-friendly résumé', body: ['The résumé builder produces clean, single-column layouts that applicant tracking systems parse reliably. Your ATS score estimates how well a given version will scan.', 'Use the tailored version for a specific role — it tunes keywords and ordering to the job description.', 'Avoid heavy graphics or multi-column PDFs from other tools; they often lower ATS scores.'], related: ['r2', 'gs2'] },
  { id: 'r2', cat: 'resume', title: 'Editing AI cover letters', body: ['Every cover letter is generated from your résumé and the role description, then fully editable. Adjust tone (Confident, Warm, Concise) and length from the editor.', 'Use the AI suggestion chips to add a metric, tighten the intro, or mirror the company’s values.', 'Letters save automatically and can be reused in any application.'], related: ['r1', 'auto1'] },
  { id: 'billing1', cat: 'billing', title: 'Changing or canceling your plan', body: ['Upgrade, downgrade or cancel anytime from Settings → Plan & billing, or the Upgrade screen.', 'Changes take effect at your next billing cycle. Unused annual time is prorated when you switch.', 'Canceling keeps your access until the end of the current period — your data is never deleted.'], related: ['billing2', 'auto2'] },
  { id: 'billing2', cat: 'billing', title: 'Understanding your invoice', body: ['Your invoice shows the plan, billing cycle, any annual discount, estimated tax, and the total charged.', 'Annual plans are billed once per year at a 33% discount versus monthly. Monthly plans bill on the same date each month.', 'Invoices are emailed and available under Settings → Plan & billing.'], related: ['billing1'] },
  { id: 'ac1', cat: 'account', title: 'Resetting your password', body: ['From the login screen, choose “Forgot?” and enter your email. We’ll send a secure reset link that expires in 30 minutes.', 'If you signed up with Google or Apple, use that provider’s sign-in instead of a password.', 'For security, you’ll be signed out of other devices after a reset.'], related: ['gs1'] },
];

const POPULAR_IDS = ['auto1', 'm1', 'gs1', 'billing1', 'r2'];

export default function AppHelp() {
  const [view, setView] = useState('home'); // home | category | article
  const [category, setCategory] = useState(null);
  const [article, setArticle] = useState(null);
  const [query, setQuery] = useState('');
  const [votes, setVotes] = useState({});

  // Backend-driven content with graceful fallback to bundled sample data.
  const [categories, setCategories] = useState(HELP_CATEGORIES);
  const [articles, setArticles] = useState(HELP_ARTICLES);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getHelpArticles();
        if (!active || !data) return;
        const list = Array.isArray(data) ? data : data.articles;
        if (Array.isArray(list) && list.length) {
          setArticles(list);
          if (Array.isArray(data.categories) && data.categories.length) {
            setCategories(data.categories);
          }
        }
      } catch {
        // Unauthenticated or request failed — keep the bundled sample content
        // so the page always renders faithfully.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const open = (id) => {
    setView('article');
    setArticle(id);
    setQuery('');
  };
  const goHome = () => {
    setView('home');
    setQuery('');
  };

  const vals = useMemo(() => {
    const q = query.trim().toLowerCase();
    const catMap = {};
    categories.forEach((c) => {
      catMap[c.key] = c;
    });

    const tagFor = (a) => catMap[a.cat] || categories[0];
    const snippet = (a) => (a.body[0] || '').slice(0, 92) + '…';

    const mkRow = (a, i, arr) => ({
      id: a.id,
      title: a.title,
      open: () => open(a.id),
      divider: i < arr.length - 1 ? '#F2ECE0' : 'transparent',
      tag: tagFor(a).tag,
      tint: tagFor(a).tint,
      ink: tagFor(a).ink,
      catLabel: (catMap[a.cat] || categories[0]).name,
      snippet: snippet(a),
    });

    const categoryRows = categories.map((c) => ({
      ...c,
      count: articles.filter((a) => a.cat === c.key).length,
      open: () => {
        setView('category');
        setCategory(c.key);
        setQuery('');
      },
    }));

    const popular = POPULAR_IDS.map((id) => articles.find((x) => x.id === id))
      .filter(Boolean)
      .map((a, i, arr) => ({ ...mkRow(a, i, arr), num: String(i + 1).padStart(2, '0') }));

    const matched = q
      ? articles.filter((a) => (a.title + ' ' + a.body.join(' ')).toLowerCase().includes(q))
      : [];
    const results = matched.map((a, i, arr) => mkRow(a, i, arr));

    const isSearch = q.length > 0;

    const catObj = catMap[category] || categories[0];
    const catArticles = articles
      .filter((a) => a.cat === (category || categories[0].key))
      .map((a, i, arr) => mkRow(a, i, arr));

    const art = articles.find((a) => a.id === article) || articles[0];
    const vote = votes[art.id];
    const relatedArts = (art.related || []).map((id) => articles.find((a) => a.id === id)).filter(Boolean);
    const related = relatedArts.map((a, i, arr) => mkRow(a, i, arr));

    return {
      isSearch,
      isBrowse: !isSearch,
      resultCount: matched.length,
      hasResults: matched.length > 0,
      noResults: matched.length === 0,
      results,
      categories: categoryRows,
      popular,
      catName: catObj.name,
      catDesc: catObj.desc,
      catTag: catObj.tag,
      catTint: catObj.tint,
      catInk: catObj.ink,
      catArticles,
      art,
      artTitle: art.title,
      artCatLabel: (catMap[art.cat] || categories[0]).name,
      artBody: art.body,
      notVoted: !vote,
      voted: !!vote,
      voteThanks: vote === 'no' ? 'Thanks — we’ll improve this article.' : 'Thanks for the feedback!',
      hasRelated: related.length > 0,
      related,
    };
  }, [query, votes, category, article, categories, articles]);

  const castVote = (vote) => {
    const id = vals.art.id;
    setVotes((s) => ({ ...s, [id]: vote }));
    submitArticleFeedback(id, vote).catch(() => {});
  };

  const showHome = view === 'home';
  const showCategory = view === 'category';
  const showArticle = view === 'article';

  return (
    <>
      <Head>
        <title>Help center — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar {
          width: 8px;
        }
        #jbapp ::-webkit-scrollbar-thumb {
          background: #e1d9c9;
          border-radius: 8px;
        }
        #jbapp input:focus {
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
        #jbapp .hc-card:hover {
          border-color: #1fa463;
        }
        #jbapp .hc-row:hover {
          background: #f7f3ea;
        }
        #jbapp .hc-yes:hover {
          background: #dcf0e4;
        }
        #jbapp .hc-no:hover {
          background: #f4efe4;
        }
      `}</style>

      <div
        id="jbapp"
        style={{ display: 'flex', minHeight: '100vh', background: '#F7F3EA', fontFamily: 'var(--jb-font-sans)', color: '#1B1A16' }}
      >
        <AppSidebar active="" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              padding: '15px 32px',
              background: 'rgba(247,243,234,0.85)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286' }}>
              Help center
            </div>
            <div style={{ flex: 1 }} />
            <Link href={appRoute('App Support.dc.html')} style={{ fontSize: 13, fontWeight: 600, color: '#157A49', textDecoration: 'none' }}>
              Contact support →
            </Link>
          </header>

          <div style={{ padding: '36px 32px 64px', maxWidth: 880, width: '100%', margin: '0 auto' }}>
            {/* ===== HOME / SEARCH ===== */}
            {showHome && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                  <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 44, lineHeight: 1.02, margin: '0 0 18px' }}>
                    How can we help?
                  </h1>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      maxWidth: 560,
                      margin: '0 auto',
                      background: '#FFFEFB',
                      border: '1px solid #E1D9C9',
                      borderRadius: 999,
                      padding: '13px 22px',
                    }}
                  >
                    <span style={{ color: '#1FA463', fontSize: 17 }}>⌕</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search help…"
                      style={{ flex: 1, border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 16, color: '#1B1A16' }}
                    />
                  </div>
                </div>

                {/* SEARCH RESULTS */}
                {vals.isSearch && (
                  <div style={{ animation: 'rbpop 0.2s ease' }}>
                    <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#8A8378', marginBottom: 14 }}>
                      {vals.resultCount} results for “{query}”
                    </div>
                    {vals.hasResults && (
                      <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                        {vals.results.map((a) => (
                          <button
                            key={a.id}
                            className="hc-row"
                            onClick={a.open}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 14,
                              padding: '16px 18px',
                              border: 'none',
                              borderBottom: `1px solid ${a.divider}`,
                              background: '#FFFEFB',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            <span
                              style={{
                                width: 36,
                                height: 36,
                                flexShrink: 0,
                                borderRadius: 9,
                                background: a.tint,
                                color: a.ink,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'var(--jb-font-mono)',
                                fontWeight: 600,
                                fontSize: 11,
                              }}
                            >
                              {a.tag}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: '#1B1A16' }}>{a.title}</span>
                              <span style={{ display: 'block', fontSize: 13, color: '#8A8378', marginTop: 2 }}>{a.snippet}</span>
                            </span>
                            <span style={{ color: '#C9BFAC', flexShrink: 0 }}>→</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {vals.noResults && (
                      <div style={{ background: '#FFFEFB', border: '1px dashed #D2C9B7', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                        <p style={{ fontSize: 14.5, color: '#8A8378', margin: 0 }}>
                          No articles matched. Try different keywords or{' '}
                          <Link href={appRoute('App Support.dc.html')} style={{ color: '#157A49', fontWeight: 600, textDecoration: 'none' }}>
                            contact support
                          </Link>
                          .
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* CATEGORY GRID + POPULAR */}
                {vals.isBrowse && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 36 }}>
                      {vals.categories.map((c) => (
                        <button
                          key={c.key}
                          className="hc-card"
                          onClick={c.open}
                          style={{
                            textAlign: 'left',
                            background: '#FFFEFB',
                            border: '1px solid #E6DECF',
                            borderRadius: 16,
                            padding: 20,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: c.tint,
                              color: c.ink,
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'var(--jb-font-mono)',
                              fontWeight: 600,
                              fontSize: 12,
                              marginBottom: 14,
                            }}
                          >
                            {c.tag}
                          </span>
                          <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#8A8378', marginBottom: 10 }}>{c.desc}</div>
                          <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F' }}>{c.count} articles</div>
                        </button>
                      ))}
                    </div>

                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 14px' }}>Popular articles</h2>
                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden', marginBottom: 30 }}>
                      {vals.popular.map((a) => (
                        <button
                          key={a.id}
                          className="hc-row"
                          onClick={a.open}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '15px 18px',
                            border: 'none',
                            borderBottom: `1px solid ${a.divider}`,
                            background: '#FFFEFB',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#9A9286', flexShrink: 0, width: 18 }}>{a.num}</span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: '#1B1A16' }}>{a.title}</span>
                          <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, color: '#A79E8F', flexShrink: 0 }}>{a.catLabel}</span>
                          <span style={{ color: '#C9BFAC', flexShrink: 0 }}>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONTACT CARD */}
                <Link
                  href={appRoute('App Support.dc.html')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    background: '#15140F',
                    border: '1px solid #2C2A22',
                    borderRadius: 16,
                    padding: '22px 24px',
                    textDecoration: 'none',
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: 11,
                      background: '#1E2D24',
                      color: '#5BD08C',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    ✦
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#FBF8F1' }}>Still stuck?</div>
                    <div style={{ fontSize: 13, color: '#9A9286' }}>Reach a human on the support team — we usually reply within a few hours.</div>
                  </div>
                  <span style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12, fontWeight: 600, color: '#5BD08C', flexShrink: 0 }}>
                    Contact support →
                  </span>
                </Link>
              </div>
            )}

            {/* ===== CATEGORY VIEW ===== */}
            {showCategory && (
              <div style={{ animation: 'rbpop 0.2s ease' }}>
                <button
                  onClick={goHome}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#5A544A',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 20,
                  }}
                >
                  ← All topics
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 46,
                      height: 46,
                      flexShrink: 0,
                      borderRadius: 12,
                      background: vals.catTint,
                      color: vals.catInk,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--jb-font-mono)',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {vals.catTag}
                  </span>
                  <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 34, lineHeight: 1, margin: 0 }}>{vals.catName}</h1>
                </div>
                <p style={{ fontSize: 14.5, color: '#8A8378', margin: '0 0 22px' }}>{vals.catDesc}</p>
                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                  {vals.catArticles.map((a) => (
                    <button
                      key={a.id}
                      className="hc-row"
                      onClick={a.open}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '16px 18px',
                        border: 'none',
                        borderBottom: `1px solid ${a.divider}`,
                        background: '#FFFEFB',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 600, color: '#1B1A16' }}>{a.title}</span>
                      <span style={{ color: '#C9BFAC', flexShrink: 0 }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ===== ARTICLE VIEW ===== */}
            {showArticle && (
              <div style={{ animation: 'rbpop 0.2s ease' }}>
                <button
                  onClick={goHome}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#5A544A',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: 20,
                  }}
                >
                  ← Help center
                </button>

                <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 18, padding: 36 }}>
                  <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#157A49', marginBottom: 12 }}>
                    {vals.artCatLabel}
                  </div>
                  <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 34, lineHeight: 1.08, margin: '0 0 22px' }}>{vals.artTitle}</h1>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {vals.artBody.map((p, i) => (
                      <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: '#46413A', margin: 0 }}>
                        {p}
                      </p>
                    ))}
                  </div>

                  {/* HELPFUL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 30, paddingTop: 22, borderTop: '1px solid #F2ECE0' }}>
                    {vals.notVoted && (
                      <>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1B1A16' }}>Was this helpful?</span>
                        <button
                          className="hc-yes"
                          onClick={() => castVote('yes')}
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#157A49',
                            background: '#EAF6EE',
                            border: '1px solid #CDE9D6',
                            borderRadius: 999,
                            padding: '8px 18px',
                            cursor: 'pointer',
                          }}
                        >
                          Yes
                        </button>
                        <button
                          className="hc-no"
                          onClick={() => castVote('no')}
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: '#5A544A',
                            background: '#FFFEFB',
                            border: '1px solid #D9D0BE',
                            borderRadius: 999,
                            padding: '8px 18px',
                            cursor: 'pointer',
                          }}
                        >
                          No
                        </button>
                      </>
                    )}
                    {vals.voted && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#157A49' }}>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: '#1FA463',
                            color: '#0C2C1C',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                          }}
                        >
                          ✓
                        </span>
                        {vals.voteThanks}
                      </span>
                    )}
                  </div>
                </div>

                {/* RELATED */}
                {vals.hasRelated && (
                  <div style={{ marginTop: 24 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Related articles</h2>
                    <div style={{ background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16, overflow: 'hidden' }}>
                      {vals.related.map((a) => (
                        <button
                          key={a.id}
                          className="hc-row"
                          onClick={a.open}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '14px 18px',
                            border: 'none',
                            borderBottom: `1px solid ${a.divider}`,
                            background: '#FFFEFB',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: '#1B1A16' }}>{a.title}</span>
                          <span style={{ color: '#C9BFAC', flexShrink: 0 }}>→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
