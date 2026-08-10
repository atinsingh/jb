'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import AppSidebar from '@/components/app/AppSidebar';
import { LoadingState, EmptyState, ErrorState, InlineError } from '@/components/app/AppStates';
import { getTemplate, resolveTheme } from '@/components/resume/resumeTemplates';
import { uploadResume } from '@/services/api';
import {
  listResumes,
  importResume,
  duplicateResume,
  setPrimaryResume,
  deleteResume,
  renameResume,
  archiveResume,
  unarchiveResume,
  createResume,
  createResumeVersion,
  getResumeVersions,
  downloadResumePdf,
  generateResumePdf,
} from '@/services/resumeApi';

/* ------------------------------------------------------------ helpers --- */
const MONO = 'var(--jb-font-mono)';
const MAX_MB = 5;

const fmtBytes = (n) => {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const relTime = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d ago`;
  return fmtDate(d);
};

const STATUS_META = {
  draft: { label: 'Draft', bg: '#F4EFE4', ink: '#8A7C5A' },
  ready: { label: 'Ready', bg: '#EAF6EE', ink: '#157A49' },
  needs_review: { label: 'Needs review', bg: '#FBF1E8', ink: '#B26A29' },
  archived: { label: 'Archived', bg: '#EFEAE0', ink: '#8A8378' },
};
const METHOD_META = {
  manual: { label: 'Manual', icon: '✎' },
  imported: { label: 'Imported', icon: '↧' },
  ai_rewrite: { label: 'AI rewrite', icon: '✦' },
  job_tailored: { label: 'Tailored', icon: '◎' },
  duplicate: { label: 'Duplicate', icon: '⧉' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'imported', label: 'Imported' },
  { key: 'ai_rewrite', label: 'AI-generated' },
  { key: 'job_tailored', label: 'Job-tailored' },
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready' },
  { key: 'archived', label: 'Archived' },
];
const SORTS = [
  { key: 'updated', label: 'Last updated' },
  { key: 'created', label: 'Date created' },
  { key: 'name', label: 'Name' },
  { key: 'ats', label: 'ATS score' },
  { key: 'used', label: 'Most used' },
];

const thumbThemeFor = (r) =>
  resolveTheme({ templateId: r.template, accentId: 'emerald', fontId: 'classic', densityId: 'cozy' });

// Map the resume parser's output onto the backend Resume schema fields.
function mapParsedToSchema(parsed) {
  const exp = Array.isArray(parsed.experience) ? parsed.experience : [];
  return {
    fullName: parsed.fullName || parsed.name || '',
    email: parsed.email || '',
    phone: parsed.phone || '',
    location: parsed.location || '',
    linkedin: parsed.linkedin || '',
    summary: parsed.summary || '',
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    experience: exp.map((e) => ({
      title: e.title || e.role || '',
      company: e.company || '',
      location: e.location || '',
      startDate: e.startDate || e.start || '',
      endDate: e.endDate || e.end || '',
      current: !!e.current,
      description: e.description || '',
      achievements: Array.isArray(e.achievements)
        ? e.achievements
        : Array.isArray(e.bullets)
        ? e.bullets
        : [],
    })),
    education: Array.isArray(parsed.education) ? parsed.education : [],
  };
}

/* ========================================================== PAGE ======= */
export default function ResumeLibrary() {
  const router = useRouter();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('grid'); // grid | list
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [versionsFor, setVersionsFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [renaming, setRenaming] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listResumes();
      setResumes(Array.isArray(data) ? data : data?.resumes || []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* -------------------------------------------------------- derived --- */
  const summary = useMemo(() => {
    const active = resumes.filter((r) => r.status !== 'archived');
    const weekAgo = Date.now() - 7 * 864e5;
    const recent = active.filter((r) => new Date(r.updatedAt).getTime() > weekAgo).length;
    const tailored = active.filter((r) => r.creationMethod === 'job_tailored').length;
    const scored = active.filter((r) => typeof r.atsScore === 'number');
    const avgAts = scored.length
      ? Math.round(scored.reduce((a, r) => a + r.atsScore, 0) / scored.length)
      : null;
    return { total: active.length, recent, tailored, avgAts };
  }, [resumes]);

  const visible = useMemo(() => {
    let list = resumes.slice();
    if (filter === 'archived') list = list.filter((r) => r.status === 'archived');
    else {
      list = list.filter((r) => r.status !== 'archived');
      if (filter === 'imported') list = list.filter((r) => r.creationMethod === 'imported' || !!r.source);
      else if (filter === 'ai_rewrite') list = list.filter((r) => r.creationMethod === 'ai_rewrite');
      else if (filter === 'job_tailored') list = list.filter((r) => r.creationMethod === 'job_tailored');
      else if (filter === 'draft') list = list.filter((r) => r.status === 'draft');
      else if (filter === 'ready') list = list.filter((r) => r.status === 'ready');
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.name, r.targetRole, r.targetCompany, r.source?.originalFilename, (r.tags || []).join(' ')]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      );
    }
    const cmp = {
      updated: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      created: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      name: (a, b) => String(a.name).localeCompare(String(b.name)),
      ats: (a, b) => (b.atsScore || 0) - (a.atsScore || 0),
      used: (a, b) => (b.applicationCount || 0) - (a.applicationCount || 0),
    }[sort];
    return list.sort(cmp);
  }, [resumes, filter, query, sort]);

  /* --------------------------------------------------------- actions --- */
  const withBusy = async (id, fn, okRefresh = true) => {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      if (okRefresh) await load();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusyId(null);
    }
  };

  const openEditor = (r) => router.push(`/app/resume?id=${r.id}`);
  const onDuplicate = (r) => withBusy(r.id, () => duplicateResume(r.id));
  const onSetPrimary = (r) => withBusy(r.id, () => setPrimaryResume(r.id));
  const onArchive = (r) =>
    withBusy(r.id, () => (r.status === 'archived' ? unarchiveResume(r.id) : archiveResume(r.id)));
  const onDownload = (r) =>
    withBusy(
      r.id,
      async () => {
        try {
          const blob = await downloadResumePdf(r.id);
          window.open(URL.createObjectURL(blob), '_blank');
        } catch (e) {
          const res = await generateResumePdf(r.id);
          if (res?.pdfUrl) window.open(res.pdfUrl, '_blank');
          else throw e;
        }
      },
      false,
    );
  const onCreateVersion = (r) =>
    withBusy(r.id, () => createResumeVersion(r.id, `Snapshot · ${new Date().toLocaleString()}`));
  const doDelete = (r) => withBusy(r.id, () => deleteResume(r.id));
  const doRename = (r, name) => withBusy(r.id, () => renameResume(r.id, name));

  /* ------------------------------------------------------------- ui --- */
  return (
    <>
      <Head>
        <title>My Resumes — Jobocate</title>
      </Head>

      <style jsx global>{`
        #jbapp ::-webkit-scrollbar { width: 8px; height: 8px; }
        #jbapp ::-webkit-scrollbar-thumb { background: #e1d9c9; border-radius: 8px; }
        #jbapp input:focus, #jbapp select:focus { outline: none; border-color: #1fa463; box-shadow: 0 0 0 3px rgba(31,164,99,0.15); }
        #jbapp .jb-card { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
        #jbapp .jb-card:hover { transform: translateY(-2px); box-shadow: 0 16px 34px -22px rgba(27,26,22,0.45); border-color: #D9D0BE; }
        #jbapp .jb-btn { transition: background .16s ease, border-color .16s ease, transform .12s ease; }
        #jbapp .jb-btn:active { transform: translateY(1px); }
        #jbapp .jb-menu-item:hover { background: #F4EFE4; }
        #jbapp .jb-row:hover { background: #FCFAF4; }
        @keyframes jbskel { 0%{opacity:.5} 50%{opacity:1} 100%{opacity:.5} }
      `}</style>

      <div
        id="jbapp"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
        }}
      >
        <AppSidebar active="resume" />

        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* HEADER */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              padding: '18px 32px 16px',
              background: 'rgba(247,243,234,0.88)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #E7E0D2',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 6 }}>
                  Toolkit / Resumes
                </div>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 34, lineHeight: 1, margin: '0 0 6px' }}>
                  My Resumes
                </h1>
                <p style={{ margin: 0, fontSize: 13.5, color: '#6B655A', maxWidth: 560 }}>
                  Keep a tailored resume for every role. Import an existing one, rewrite it with AI, or
                  build from scratch — every version stays in one place.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="jb-btn" onClick={() => setImportOpen(true)} style={secondaryBtn}>
                  ↧ Import Resume
                </button>
                <button
                  type="button"
                  className="jb-btn"
                  onClick={() =>
                    withBusy(
                      'new',
                      async () => {
                        const r = await createResume({ template: 'modern', name: 'Untitled Resume' });
                        router.push(`/app/resume?id=${r._id || r.id}`);
                      },
                      false,
                    )
                  }
                  style={primaryBtn}
                >
                  + Create Resume
                </button>
              </div>
            </div>
          </header>

          <div style={{ padding: '22px 32px 60px', flex: 1 }}>
            {actionError && <InlineError error={actionError} />}

            {/* SUMMARY CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 22 }}>
              <SummaryCard label="Total resumes" value={loading ? '—' : summary.total} hint="active" />
              <SummaryCard label="Updated this week" value={loading ? '—' : summary.recent} hint="last 7 days" />
              <SummaryCard label="Job-tailored" value={loading ? '—' : summary.tailored} hint="for specific roles" />
              <SummaryCard label="Avg ATS score" value={loading ? '—' : summary.avgAts != null ? `${summary.avgAts}%` : '—'} hint={summary.avgAts != null ? 'across scored' : 'not scored yet'} />
            </div>

            {/* TOOLBAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 360 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#B7AE9C', fontSize: 14 }}>⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, role, company, filename…"
                  aria-label="Search resumes"
                  style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1px solid #E0D8C7', background: '#FFFEFB', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {FILTERS.map((f) => {
                  const on = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${on ? '#1FA463' : '#E0D8C7'}`, background: on ? '#EAF6EE' : '#FFFEFB', color: on ? '#157A49' : '#6B655A', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort resumes"
                style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid #E0D8C7', background: '#FFFEFB', fontFamily: 'inherit', fontSize: 13, color: '#1B1A16', cursor: 'pointer' }}
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>Sort · {s.label}</option>
                ))}
              </select>
              <div style={{ display: 'flex', border: '1px solid #E0D8C7', borderRadius: 10, overflow: 'hidden' }}>
                {['grid', 'list'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-label={`${v} view`}
                    style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', fontSize: 13, background: view === v ? '#1B1A16' : '#FFFEFB', color: view === v ? '#fff' : '#8A8378' }}
                  >
                    {v === 'grid' ? '▦' : '☰'}
                  </button>
                ))}
              </div>
            </div>

            {/* BODY */}
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 250, borderRadius: 14, background: '#EFE9DD', animation: 'jbskel 1.2s ease-in-out infinite' }} />
                ))}
              </div>
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : resumes.length === 0 ? (
              <EmptyState
                icon="📄"
                title="No resumes yet"
                hint="Import an existing resume or create one from scratch to get started."
                action={
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" className="jb-btn" onClick={() => setImportOpen(true)} style={secondaryBtn}>↧ Import</button>
                    <button type="button" className="jb-btn" onClick={() => router.push('/app/resume')} style={primaryBtn}>+ Create</button>
                  </div>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState icon="⌕" title="No matches" hint="Try a different search or filter." />
            ) : view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))', gap: 16 }}>
                {visible.map((r) => (
                  <ResumeCard
                    key={r.id}
                    r={r}
                    busy={busyId === r.id}
                    onOpen={() => openEditor(r)}
                    onDuplicate={() => onDuplicate(r)}
                    onSetPrimary={() => onSetPrimary(r)}
                    onArchive={() => onArchive(r)}
                    onDownload={() => onDownload(r)}
                    onVersions={() => setVersionsFor(r)}
                    onRename={() => setRenaming(r)}
                    onDelete={() => setConfirmDelete(r)}
                    onCreateVersion={() => onCreateVersion(r)}
                  />
                ))}
              </div>
            ) : (
              <ResumeTable
                rows={visible}
                busyId={busyId}
                onOpen={openEditor}
                onDuplicate={onDuplicate}
                onSetPrimary={onSetPrimary}
                onArchive={onArchive}
                onDownload={onDownload}
                onVersions={setVersionsFor}
                onRename={setRenaming}
                onDelete={setConfirmDelete}
                onCreateVersion={onCreateVersion}
              />
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {importOpen && (
          <ImportModal onClose={() => setImportOpen(false)} onDone={async () => { setImportOpen(false); await load(); }} />
        )}
        {versionsFor && (
          <VersionsDrawer resume={versionsFor} onClose={() => setVersionsFor(null)} onChanged={load} />
        )}
        {confirmDelete && (
          <ConfirmDialog
            title={`Delete “${confirmDelete.name}”?`}
            body="This permanently removes the resume and its version history. Any job applications that used it keep their record."
            confirmLabel="Delete resume"
            danger
            onCancel={() => setConfirmDelete(null)}
            onConfirm={async () => { const r = confirmDelete; setConfirmDelete(null); await doDelete(r); }}
          />
        )}
        {renaming && (
          <RenameModal
            resume={renaming}
            onCancel={() => setRenaming(null)}
            onSave={async (name) => { const r = renaming; setRenaming(null); await doRename(r, name); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ===================================================== sub-components === */
function SummaryCard({ label, value, hint }) {
  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9A9286' }}>{hint}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: m.bg, color: m.ink }}>{m.label}</span>;
}

function Thumbnail({ r, h = 132 }) {
  const t = getTemplate(r.template);
  const Thumb = t.Thumb;
  return (
    <div style={{ height: h, borderRadius: 10, overflow: 'hidden', border: '1px solid #EAE3D4', background: '#fff', display: 'flex' }}>
      <div style={{ margin: 'auto', width: '72%' }}>
        <Thumb theme={thumbThemeFor(r)} />
      </div>
    </div>
  );
}

function ActionsMenu({ r, actions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const isArchived = r.status === 'archived';
  const items = [
    { label: 'Open editor', fn: actions.onOpen },
    { label: 'Rename', fn: actions.onRename },
    { label: 'Duplicate', fn: actions.onDuplicate },
    { label: 'Create version', fn: actions.onCreateVersion },
    { label: 'Version history', fn: actions.onVersions },
    { label: r.isPrimary ? 'Primary resume ✓' : 'Set as primary', fn: r.isPrimary ? null : actions.onSetPrimary },
    { label: 'Download PDF', fn: actions.onDownload },
    { label: isArchived ? 'Unarchive' : 'Archive', fn: actions.onArchive },
    { label: 'Delete', fn: actions.onDelete, danger: true },
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="More actions"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E0D8C7', background: '#FFFEFB', cursor: 'pointer', color: '#6B655A', fontSize: 16, lineHeight: 1 }}
      >
        ⋯
      </button>
      {open && (
        <div
          style={{ position: 'absolute', right: 0, top: 36, zIndex: 30, width: 190, background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 12, boxShadow: '0 20px 44px -20px rgba(27,26,22,0.4)', padding: 6 }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              className="jb-menu-item"
              disabled={!it.fn}
              onClick={() => { setOpen(false); it.fn && it.fn(); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: it.fn ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 13, color: it.danger ? '#B4472A' : !it.fn ? '#B7AE9C' : '#2A2820' }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumeCard({ r, busy, ...actions }) {
  const method = METHOD_META[r.creationMethod] || METHOD_META.manual;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="jb-card"
      style={{ position: 'relative', background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 14, padding: 14, opacity: busy ? 0.6 : 1 }}
    >
      <div onClick={actions.onOpen} style={{ cursor: 'pointer' }}>
        <Thumbnail r={r} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span onClick={actions.onOpen} style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>{r.name}</span>
            {r.isPrimary && <span title="Primary resume" style={{ fontSize: 11, fontWeight: 700, color: '#157A49', background: '#EAF6EE', padding: '2px 7px', borderRadius: 999 }}>PRIMARY</span>}
          </div>
          <div style={{ fontSize: 12.5, color: '#8A8378', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.targetRole || 'No target role'}
          </div>
        </div>
        <ActionsMenu r={r} actions={actions} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <StatusBadge status={r.status} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B655A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: r.creationMethod === 'ai_rewrite' ? '#1FA463' : '#9A9286' }}>{method.icon}</span>{method.label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#B7AE9C' }}>v{r.version}</span>
        {typeof r.atsScore === 'number' && (
          <span style={{ fontFamily: MONO, fontSize: 11, color: '#157A49' }}>ATS {r.atsScore}%</span>
        )}
      </div>

      {r.source?.originalFilename ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #EBE4D6', fontSize: 11.5, color: '#8A8378', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span aria-hidden>↧</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.source.originalFilename}>{r.source.originalFilename}</span>
            <span style={{ color: '#C9BFAC' }}>·</span>
            <span style={{ fontFamily: MONO }}>{(r.source.fileExtension || '').replace('.', '').toUpperCase() || 'FILE'}</span>
            <span style={{ color: '#C9BFAC' }}>·</span>
            <span>{fmtBytes(r.source.fileSize)}</span>
          </div>
          <div style={{ marginTop: 2 }}>Imported {fmtDate(r.source.importedAt)}</div>
        </div>
      ) : (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #EBE4D6', fontSize: 11.5, color: '#B7AE9C' }}>
          Created {fmtDate(r.createdAt)}
        </div>
      )}

      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: '#9A9286' }}>
        <span>Edited {relTime(r.updatedAt)}</span>
        {r.applicationCount > 0 && <span style={{ fontFamily: MONO }}>{r.applicationCount} application{r.applicationCount > 1 ? 's' : ''}</span>}
      </div>
    </motion.div>
  );
}

function ResumeTable({ rows, busyId, ...h }) {
  return (
    <div style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 1.6fr 0.7fr 40px', gap: 12, padding: '11px 18px', borderBottom: '1px solid #EBE4D6', fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9286' }}>
        <span>Resume</span><span>Status / Method</span><span>Version</span><span>Source · Imported</span><span>Edited</span><span />
      </div>
      {rows.map((r) => {
        const method = METHOD_META[r.creationMethod] || METHOD_META.manual;
        return (
          <div key={r.id} className="jb-row" style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 1fr 1.6fr 0.7fr 40px', gap: 12, padding: '13px 18px', borderBottom: '1px solid #F1EBDF', alignItems: 'center', fontSize: 13, opacity: busyId === r.id ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <div style={{ width: 34, height: 44, borderRadius: 5, overflow: 'hidden', border: '1px solid #EAE3D4', flexShrink: 0 }}>
                <Thumbnail r={r} h={44} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span onClick={() => h.onOpen(r)} style={{ fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  {r.isPrimary && <span style={{ fontSize: 11, fontWeight: 700, color: '#157A49', background: '#EAF6EE', padding: '1px 6px', borderRadius: 999 }}>PRIMARY</span>}
                </div>
                <div style={{ fontSize: 12, color: '#8A8378', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.targetRole || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <StatusBadge status={r.status} />
              <span style={{ fontSize: 11.5, color: '#6B655A' }}>{method.icon} {method.label}</span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 12, color: '#6B655A' }}>v{r.version}{typeof r.atsScore === 'number' ? ` · ATS ${r.atsScore}%` : ''}</span>
            <div style={{ fontSize: 12, color: '#8A8378', minWidth: 0 }}>
              {r.source?.originalFilename ? (
                <>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.source.originalFilename}>{r.source.originalFilename} · {fmtBytes(r.source.fileSize)}</div>
                  <div>{fmtDate(r.source.importedAt)}</div>
                </>
              ) : (
                <span style={{ color: '#B7AE9C' }}>Created {fmtDate(r.createdAt)}</span>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#9A9286' }}>{relTime(r.updatedAt)}</span>
            <ActionsMenu r={r} actions={{ onOpen: () => h.onOpen(r), onRename: () => h.onRename(r), onDuplicate: () => h.onDuplicate(r), onCreateVersion: () => h.onCreateVersion(r), onVersions: () => h.onVersions(r), onSetPrimary: () => h.onSetPrimary(r), onDownload: () => h.onDownload(r), onArchive: () => h.onArchive(r), onDelete: () => h.onDelete(r) }} />
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------- import modal ------ */
function ImportModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('keep_format');
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [step, setStep] = useState('upload'); // upload | mode | processing
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);

  const pick = (f) => {
    setErr(null);
    if (!f) return;
    const ext = (f.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) { setErr(new Error('Unsupported file. Upload a PDF or DOCX.')); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(new Error(`File too large (max ${MAX_MB}MB).`)); return; }
    setFile(f);
    setName((n) => n || f.name.replace(/\.[^.]+$/, ''));
    setStep('mode');
  };

  const run = async () => {
    if (!file) return;
    setStep('processing');
    setErr(null);
    try {
      const res = await uploadResume(file); // POST /api/resume/parse (heuristic fallback safe)
      const parsed = res?.parsedData || res?.parsed || res || {};
      const ext = (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
      await importResume({
        name: name || file.name.replace(/\.[^.]+$/, ''),
        importMode: mode,
        targetRole: targetRole || undefined,
        template: 'modern',
        ...mapParsedToSchema(parsed),
        source: {
          originalFilename: file.name,
          fileExtension: ext,
          mimeType: file.type || '',
          fileSize: file.size,
          parseStatus: parsed._source === 'heuristic' ? 'partial' : 'parsed',
          parseConfidence: parsed._source === 'heuristic' ? 0.6 : 0.9,
        },
      });
      await onDone();
    } catch (e) {
      setErr(e);
      setStep('mode');
    }
  };

  return (
    <Overlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
        style={modalCard}
      >
        <ModalHead title="Import a resume" onClose={onClose} />
        <div style={{ padding: 22 }}>
          {err && <InlineError error={err} />}

          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
              onClick={() => inputRef.current?.click()}
              style={{ border: '2px dashed #D9D0BE', borderRadius: 14, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', background: '#FCFAF4' }}
            >
              <div style={{ fontSize: 34, marginBottom: 10 }}>↧</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Drop your resume here</div>
              <div style={{ fontSize: 13, color: '#8A8378' }}>or click to browse · PDF or DOCX · max {MAX_MB}MB</div>
              <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          )}

          {step === 'mode' && file && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid #E7E0D2', background: '#FFFEFB', marginBottom: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EAF6EE', color: '#157A49', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: MONO, fontSize: 11 }}>
                  {(file.name.match(/\.([^.]+)$/) || ['', 'FILE'])[1].toUpperCase().slice(0, 4)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: '#8A8378' }}>{fmtBytes(file.size)}</div>
                </div>
                <button type="button" onClick={() => { setFile(null); setStep('upload'); }} style={{ ...secondaryBtn, padding: '6px 12px', fontSize: 12.5 }}>Replace</button>
              </div>

              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9286', marginBottom: 10 }}>How should we import it?</div>
              <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                <ModeOption active={mode === 'keep_format'} onClick={() => setMode('keep_format')} title="Keep original format" desc="Preserve the wording and structure of your file. We extract it into editable sections without rewriting." icon="⧉" />
                <ModeOption active={mode === 'ai_rewrite'} onClick={() => setMode('ai_rewrite')} title="Rewrite with AI" desc="Import the content, then improve clarity, impact and ATS fit. AI never invents facts — you review every change." icon="✦" ai />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <Field label="Resume name">
                  <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="e.g. Backend Engineer" />
                </Field>
                <Field label="Target role (optional)">
                  <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={inp} placeholder="e.g. Senior Backend Engineer" />
                </Field>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={onClose} style={secondaryBtn}>Cancel</button>
                <button type="button" onClick={run} style={primaryBtn}>Import resume</button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div style={{ padding: '30px 0' }}>
              <LoadingState label={mode === 'ai_rewrite' ? 'Importing & preparing AI review…' : 'Extracting your resume…'} />
            </div>
          )}
        </div>
      </motion.div>
    </Overlay>
  );
}

function ModeOption({ active, onClick, title, desc, icon, ai }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        display: 'flex',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        cursor: 'pointer',
        background: active && ai ? 'linear-gradient(180deg,#F3FBF6,#EAF6EE)' : '#FFFEFB',
        border: `1.5px solid ${active ? '#1FA463' : '#E7E0D2'}`,
        boxShadow: active ? '0 0 0 3px rgba(31,164,99,0.12)' : 'none',
        fontFamily: 'inherit',
      }}
    >
      <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ai ? '#1FA463' : '#F4EFE4', color: ai ? '#fff' : '#6B655A', fontSize: 15 }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: '#6B655A', lineHeight: 1.5 }}>{desc}</span>
      </span>
    </button>
  );
}

/* -------------------------------------------------- versions drawer ---- */
function VersionsDrawer({ resume, onClose, onChanged }) {
  const [versions, setVersions] = useState(null);
  const [err, setErr] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const v = await getResumeVersions(resume.id);
      setVersions(Array.isArray(v) ? v : v?.versions || []);
    } catch (e) {
      setErr(e);
      setVersions([]);
    }
  }, [resume.id]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      await createResumeVersion(resume.id, `Snapshot · ${new Date().toLocaleString()}`);
      await load();
      onChanged && onChanged();
    } catch (e) {
      setErr(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Overlay onClose={onClose} align="right">
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '94vw', height: '100vh', background: '#F7F3EA', borderLeft: '1px solid #E7E0D2', display: 'flex', flexDirection: 'column' }}
      >
        <ModalHead title="Version history" subtitle={resume.name} onClose={onClose} />
        <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
          {err && <InlineError error={err} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#6B655A' }}>Current: <b>v{resume.version}</b></span>
            <button type="button" onClick={create} disabled={creating} style={{ ...primaryBtn, padding: '8px 14px', fontSize: 13 }}>{creating ? 'Saving…' : '+ Save version'}</button>
          </div>

          {versions === null ? (
            <LoadingState label="Loading versions…" />
          ) : versions.length === 0 ? (
            <EmptyState icon="⏱" title="No saved versions yet" hint="Save a version to snapshot the current resume so you can restore it later." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {versions.map((v, i) => (
                <div key={v._id || i} style={{ background: '#FFFEFB', border: '1px solid #E7E0D2', borderRadius: 12, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Version {v.version ?? v.versionNumber ?? '—'}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: '#9A9286' }}>{fmtDate(v.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6B655A' }}>{v.description || v.label || 'Snapshot'}</div>
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 11.5, color: '#9A9286', marginTop: 16, lineHeight: 1.5 }}>
            Versions snapshot this resume so you can restore or compare later. Separate resumes (for different roles) live in the library, not here.
          </p>
        </div>
      </motion.div>
    </Overlay>
  );
}

/* ------------------------------------------------------- primitives ---- */
function Overlay({ children, onClose, align = 'center' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(27,26,22,0.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: align === 'right' ? 'stretch' : 'center', justifyContent: align === 'right' ? 'flex-end' : 'center', padding: align === 'right' ? 0 : 20 }}
    >
      {children}
    </motion.div>
  );
}

function ModalHead({ title, subtitle, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E7E0D2' }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: '#8A8378', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E0D8C7', background: '#FFFEFB', cursor: 'pointer', fontSize: 15, color: '#6B655A' }}>✕</button>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <Overlay onClose={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 440 }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
          <p style={{ fontSize: 13.5, color: '#6B655A', lineHeight: 1.6, margin: '0 0 22px' }}>{body}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onCancel} style={secondaryBtn}>Cancel</button>
            <button type="button" onClick={onConfirm} style={danger ? dangerBtn : primaryBtn}>{confirmLabel}</button>
          </div>
        </div>
      </motion.div>
    </Overlay>
  );
}

function RenameModal({ resume, onCancel, onSave }) {
  const [name, setName] = useState(resume.name || '');
  return (
    <Overlay onClose={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(e) => e.stopPropagation()} style={{ ...modalCard, maxWidth: 420 }}>
        <ModalHead title="Rename resume" onClose={onCancel} />
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }} style={{ padding: 22 }}>
          <Field label="Resume name">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inp} />
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onCancel} style={secondaryBtn}>Cancel</button>
            <button type="submit" style={primaryBtn}>Save</button>
          </div>
        </form>
      </motion.div>
    </Overlay>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B655A', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

/* --------------------------------------------------------- style tokens */
const primaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#0C2C1C', background: '#1FA463', border: 'none', borderRadius: 999, padding: '10px 18px', cursor: 'pointer' };
const secondaryBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: '#1B1A16', background: '#FFFEFB', border: '1px solid #D9D0BE', borderRadius: 999, padding: '10px 16px', cursor: 'pointer' };
const dangerBtn = { ...primaryBtn, color: '#fff', background: '#B4472A' };
const modalCard = { width: 560, maxWidth: '94vw', background: '#F7F3EA', borderRadius: 16, boxShadow: '0 40px 90px -30px rgba(27,26,22,0.5)', overflow: 'hidden' };
const inp = { width: '100%', padding: '9px 12px', borderRadius: 10, border: '1px solid #E0D8C7', background: '#FFFEFB', fontFamily: 'inherit', fontSize: 13.5, color: '#1B1A16' };
