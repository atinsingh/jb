'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Card,
  Btn,
  Pill,
  Select,
  TextInput,
  Table,
  Td,
  Pagination,
  ConfirmDialog,
  COLORS,
} from '@/components/admin/AdminUI';
import { LoadingState, ErrorState, EmptyState } from '@/components/employer/EmployerStates';
import { adminJobsApi } from '@/services/adminApi';

// Enum value sets. If the backend rejects a value it surfaces as an inline
// error — never a silent no-op.
const MODERATION = ['pending', 'approved', 'rejected', 'flagged'];
const LIFECYCLE = ['active', 'paused', 'expired', 'archived'];

const MODERATION_FILTER = [{ value: '', label: 'All moderation' }, ...MODERATION.map((v) => ({ value: v, label: v }))];
const LIFECYCLE_FILTER = [{ value: '', label: 'All lifecycle' }, ...LIFECYCLE.map((v) => ({ value: v, label: v }))];

const modTone = (s) =>
  s === 'approved' ? 'green' : s === 'rejected' ? 'red' : s === 'flagged' ? 'amber' : 'neutral';
const lifeTone = (s) =>
  s === 'active' ? 'green' : s === 'archived' || s === 'expired' ? 'neutral' : 'blue';

const SCRAPERS = [
  { key: 'greenhouse', label: 'Greenhouse' },
  { key: 'lever', label: 'Lever' },
  { key: 'workday', label: 'Workday' },
];

const LIMIT = 20;

export default function AdminJobs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ jobs: [], total: 0 });

  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [moderationStatus, setModerationStatus] = useState('');
  const [page, setPage] = useState(1);

  const [rowBusy, setRowBusy] = useState(null); // id currently mutating
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  // scraper trigger confirm: { key, label }
  const [scraper, setScraper] = useState(null);
  const [scraperBusy, setScraperBusy] = useState(false);
  const [scraperError, setScraperError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminJobsApi.list({ lifecycle, moderationStatus, q, page, limit: LIMIT });
      setData({
        jobs: Array.isArray(res?.jobs) ? res.jobs : [],
        total: typeof res?.total === 'number' ? res.total : 0,
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [lifecycle, moderationStatus, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeFilter = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  };

  const mutate = async (job, fn, successMsg) => {
    const id = job._id || job.id;
    setRowBusy(id);
    setActionError(null);
    try {
      await fn(id);
      setNotice(successMsg);
      await load();
    } catch (err) {
      setActionError(err);
    } finally {
      setRowBusy(null);
    }
  };

  const runScraper = async () => {
    if (!scraper) return;
    setScraperBusy(true);
    setScraperError(null);
    try {
      await adminJobsApi.triggerScraper(scraper.key);
      setScraper(null);
      setNotice(`${scraper.label} scraper triggered.`);
    } catch (err) {
      setScraperError(err);
    } finally {
      setScraperBusy(false);
    }
  };

  return (
    <AdminShell
      active="jobs"
      title="Job moderation"
      crumb="Admin / Moderation"
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SCRAPERS.map((s) => (
            <Btn key={s.key} variant="accent" onClick={() => { setScraperError(null); setScraper(s); }}>
              Run {s.label}
            </Btn>
          ))}
        </div>
      }
    >
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: 'var(--jb-font-display)',
            fontWeight: 400,
            fontSize: 40,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            margin: '0 0 8px',
          }}
        >
          Job moderation
        </h1>
        <p style={{ fontSize: 15.5, color: COLORS.sub, margin: 0 }}>
          Review the queue, set moderation and lifecycle state, or trigger the scrapers.
        </p>
      </div>

      {/* FILTER BAR */}
      <Card style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
            <TextInput
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search title or company…"
              style={{ flex: 1 }}
              aria-label="Search jobs"
            />
            <Btn type="submit" variant="primary">
              Search
            </Btn>
          </form>
          <Select
            value={moderationStatus}
            onChange={(e) => changeFilter(setModerationStatus)(e.target.value)}
            options={MODERATION_FILTER}
          />
          <Select
            value={lifecycle}
            onChange={(e) => changeFilter(setLifecycle)(e.target.value)}
            options={LIFECYCLE_FILTER}
          />
        </div>
      </Card>

      {notice && (
        <div
          role="status"
          style={{
            margin: '0 0 12px',
            padding: '10px 14px',
            borderRadius: 8,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#047857',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857', fontWeight: 700 }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          style={{
            margin: '0 0 12px',
            padding: '10px 14px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: 13,
          }}
        >
          {actionError.message || String(actionError)}
        </div>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <LoadingState label="Loading jobs…" />
        ) : error ? (
          <ErrorState error={error} onRetry={load} />
        ) : data.jobs.length === 0 ? (
          <EmptyState title="No jobs match" hint="Adjust filters, or trigger a scraper to ingest new jobs." />
        ) : (
          <div style={{ padding: '6px 6px 0' }}>
            <Table head={['Job', 'Moderation', 'Lifecycle', 'Set moderation', 'Set lifecycle', '']}>
              {data.jobs.map((j) => {
                const id = j._id || j.id;
                const busy = rowBusy === id;
                return (
                  <tr key={id} style={{ opacity: busy ? 0.5 : 1 }}>
                    <Td>
                      <div style={{ fontWeight: 600, color: COLORS.ink }}>{j.title || 'Untitled role'}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>
                        {[j.company, j.location].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={modTone(j.moderationStatus)}>{j.moderationStatus || 'pending'}</Pill>
                    </Td>
                    <Td>
                      <Pill tone={lifeTone(j.lifecycle)}>{j.lifecycle || '—'}</Pill>
                    </Td>
                    <Td>
                      <Select
                        value={j.moderationStatus || 'pending'}
                        disabled={busy}
                        onChange={(e) =>
                          mutate(j, (id2) => adminJobsApi.setModeration(id2, e.target.value), 'Moderation updated.')
                        }
                        options={MODERATION.map((v) => ({ value: v, label: v }))}
                        style={{ width: 130 }}
                      />
                    </Td>
                    <Td>
                      <Select
                        value={j.lifecycle || 'active'}
                        disabled={busy}
                        onChange={(e) =>
                          mutate(j, (id2) => adminJobsApi.setLifecycle(id2, e.target.value), 'Lifecycle updated.')
                        }
                        options={LIFECYCLE.map((v) => ({ value: v, label: v }))}
                        style={{ width: 130 }}
                      />
                    </Td>
                    <Td>
                      <Btn
                        variant="danger"
                        disabled={busy}
                        onClick={() => mutate(j, (id2) => adminJobsApi.deactivate(id2), 'Job deactivated.')}
                      >
                        Deactivate
                      </Btn>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}
      </Card>

      {!loading && !error && data.jobs.length > 0 && (
        <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />
      )}

      {/* SCRAPER CONFIRM */}
      <ConfirmDialog
        open={!!scraper}
        title={scraper ? `Run ${scraper.label} scraper` : ''}
        message={
          scraper
            ? `Trigger an ingestion run for ${scraper.label}? This queues a scrape of the configured boards.`
            : ''
        }
        confirmLabel="Trigger run"
        confirmVariant="accent"
        busy={scraperBusy}
        error={scraperError}
        onConfirm={runScraper}
        onCancel={() => {
          if (!scraperBusy) setScraper(null);
        }}
      />
    </AdminShell>
  );
}
