'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Card,
  SectionTitle,
  Btn,
  Pill,
  Select,
  TextInput,
  Table,
  Td,
  ConfirmDialog,
  COLORS,
} from '@/components/admin/AdminUI';
import { LoadingState, ErrorState, EmptyState } from '@/components/employer/EmployerStates';
import { adminIngestionApi } from '@/services/adminApi';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : String(n ?? '—'));

const healthTone = (h) => {
  const s = String(h || '').toLowerCase();
  if (s.includes('healthy') || s === 'ok' || s === 'green') return 'green';
  if (s.includes('degrad') || s.includes('warn') || s === 'amber') return 'amber';
  if (s.includes('down') || s.includes('fail') || s.includes('error') || s === 'red') return 'red';
  return 'neutral';
};

const runTone = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'success' || v === 'completed' || v === 'done') return 'green';
  if (v === 'running' || v === 'pending' || v === 'queued') return 'blue';
  if (v === 'failed' || v === 'error' || v === 'cancelled' || v === 'canceled') return 'red';
  return 'neutral';
};

const isRunning = (s) => ['running', 'pending', 'queued'].includes(String(s || '').toLowerCase());

const shortId = (id) => (id ? String(id).slice(-8) : '—');
const fmtTime = (t) => {
  if (!t) return '—';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString();
};

/* Generic renderer for the ingestion metrics blob (shape not fixed): numbers
 * become stat tiles, nested objects become a labelled key/value list. */
function MetricsView({ metrics }) {
  const numeric = Object.entries(metrics).filter(([, v]) => typeof v === 'number');
  const nested = Object.entries(metrics).filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v));

  if (numeric.length === 0 && nested.length === 0) {
    return <div style={{ fontSize: 13, color: COLORS.muted }}>No metrics reported.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {numeric.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {numeric.map(([k, v]) => (
            <div key={k} style={{ background: '#F8FAFC', border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 14 }}>
              <div
                style={{
                  fontFamily: 'var(--jb-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: COLORS.muted,
                  marginBottom: 6,
                }}
              >
                {k}
              </div>
              <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 24, fontWeight: 600, color: COLORS.ink }}>
                {fmt(v)}
              </div>
            </div>
          ))}
        </div>
      )}
      {nested.map(([k, obj]) => (
        <div key={k}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>{k}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(obj).map(([kk, vv]) => (
              <Pill key={kk} tone="neutral">
                {kk}: {fmt(vv)}
              </Pill>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminIngestion() {
  const [sources, setSources] = useState({ loading: true, error: null, data: [] });
  const [runs, setRuns] = useState({ loading: true, error: null, data: [] });
  const [dead, setDead] = useState({ loading: true, error: null, data: [] });
  const [metrics, setMetrics] = useState({ loading: true, error: null, data: null });

  const [rowBusy, setRowBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', type: 'greenhouse', url: '' });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const loadSources = useCallback(async () => {
    setSources((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await adminIngestionApi.listSources();
      const arr = Array.isArray(res) ? res : Array.isArray(res?.sources) ? res.sources : [];
      setSources({ loading: false, error: null, data: arr });
    } catch (err) {
      setSources({ loading: false, error: err, data: [] });
    }
  }, []);

  const loadRuns = useCallback(async () => {
    setRuns((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await adminIngestionApi.listRuns({ limit: 20 });
      const arr = Array.isArray(res) ? res : Array.isArray(res?.runs) ? res.runs : [];
      setRuns({ loading: false, error: null, data: arr });
    } catch (err) {
      setRuns({ loading: false, error: err, data: [] });
    }
  }, []);

  const loadDead = useCallback(async () => {
    setDead((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await adminIngestionApi.listDeadLetters({ reprocessed: 'false' });
      const arr = Array.isArray(res) ? res : Array.isArray(res?.deadLetters) ? res.deadLetters : [];
      setDead({ loading: false, error: null, data: arr });
    } catch (err) {
      setDead({ loading: false, error: err, data: [] });
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetrics((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await adminIngestionApi.metrics();
      setMetrics({ loading: false, error: null, data: res && typeof res === 'object' ? res : null });
    } catch (err) {
      setMetrics({ loading: false, error: err, data: null });
    }
  }, []);

  useEffect(() => {
    loadSources();
    loadRuns();
    loadDead();
    loadMetrics();
  }, [loadSources, loadRuns, loadDead, loadMetrics]);

  const withRow = async (key, fn, msg, reloaders = []) => {
    setRowBusy(key);
    setActionError(null);
    try {
      await fn();
      setNotice(msg);
      await Promise.all(reloaders.map((r) => r()));
    } catch (err) {
      setActionError(err);
    } finally {
      setRowBusy(null);
    }
  };

  const submitCreate = async () => {
    setCreateBusy(true);
    setCreateError(null);
    try {
      const dto = { name: createForm.name.trim(), type: createForm.type };
      if (createForm.url.trim()) dto.url = createForm.url.trim();
      await adminIngestionApi.createSource(dto);
      setCreateOpen(false);
      setCreateForm({ name: '', type: 'greenhouse', url: '' });
      setNotice('Source created.');
      await loadSources();
    } catch (err) {
      setCreateError(err);
    } finally {
      setCreateBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await adminIngestionApi.deleteSource(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Source deleted.');
      await loadSources();
    } catch (err) {
      setDeleteError(err);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <AdminShell
      active="ingestion"
      title="Ingestion"
      crumb="Admin / Ingestion"
      actions={
        <Btn variant="accent" onClick={() => { setCreateError(null); setCreateOpen(true); }}>
          + Add source
        </Btn>
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
          Ingestion
        </h1>
        <p style={{ fontSize: 15.5, color: COLORS.sub, margin: 0 }}>
          Manage ingestion sources, watch recent runs, and reprocess dead-letters.
        </p>
      </div>

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

      {/* METRICS */}
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle
          right={
            <Btn onClick={loadMetrics} style={{ padding: '6px 10px' }}>
              Refresh
            </Btn>
          }
        >
          Ingestion metrics
        </SectionTitle>
        {metrics.loading ? (
          <LoadingState label="Loading metrics…" />
        ) : metrics.error ? (
          <ErrorState error={metrics.error} onRetry={loadMetrics} />
        ) : !metrics.data ? (
          <EmptyState title="No metrics" hint="The ingestion metrics endpoint returned no data." />
        ) : (
          <MetricsView metrics={metrics.data} />
        )}
      </Card>

      {/* SOURCES */}
      <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <SectionTitle
            right={
              <Btn onClick={loadSources} style={{ padding: '6px 10px' }}>
                Refresh
              </Btn>
            }
          >
            Sources
          </SectionTitle>
        </div>
        {sources.loading ? (
          <LoadingState label="Loading sources…" />
        ) : sources.error ? (
          <ErrorState error={sources.error} onRetry={loadSources} />
        ) : sources.data.length === 0 ? (
          <EmptyState title="No sources configured" hint="Add a source to begin ingesting jobs." />
        ) : (
          <div style={{ padding: '0 6px 6px' }}>
            <Table head={['Source', 'Health', 'State', 'Controls', '']}>
              {sources.data.map((src) => {
                const id = src._id || src.id;
                const enabled = src.enabled !== false;
                const stopped = src.emergencyStopped === true || src.stopped === true;
                return (
                  <tr key={id} style={{ opacity: String(rowBusy || '').startsWith(`src:${id}`) ? 0.5 : 1 }}>
                    <Td>
                      <div style={{ fontWeight: 600, color: COLORS.ink }}>{src.name || src.type || 'Source'}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>
                        {[src.type || src.provider, src.url].filter(Boolean).join(' · ') || shortId(id)}
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={healthTone(src.health)}>{src.health || 'unknown'}</Pill>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Pill tone={enabled ? 'green' : 'neutral'}>{enabled ? 'enabled' : 'disabled'}</Pill>
                        {stopped && <Pill tone="red">e-stopped</Pill>}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Btn
                          disabled={!!rowBusy}
                          onClick={() =>
                            withRow(
                              `src:${id}:enable`,
                              () => adminIngestionApi.setEnabled(id, !enabled),
                              enabled ? 'Source disabled.' : 'Source enabled.',
                              [loadSources],
                            )
                          }
                        >
                          {enabled ? 'Disable' : 'Enable'}
                        </Btn>
                        <Btn
                          variant={stopped ? 'accent' : 'danger'}
                          disabled={!!rowBusy}
                          onClick={() =>
                            withRow(
                              `src:${id}:stop`,
                              () => adminIngestionApi.setEmergencyStop(id, !stopped),
                              stopped ? 'Emergency-stop cleared.' : 'Emergency-stop engaged.',
                              [loadSources],
                            )
                          }
                        >
                          {stopped ? 'Clear stop' : 'E-stop'}
                        </Btn>
                        <Btn
                          variant="primary"
                          disabled={!!rowBusy}
                          onClick={() =>
                            withRow(
                              `src:${id}:run`,
                              () => adminIngestionApi.runSource(id),
                              'Run queued.',
                              [loadRuns],
                            )
                          }
                        >
                          Run now
                        </Btn>
                      </div>
                    </Td>
                    <Td>
                      <Btn variant="ghost" disabled={!!rowBusy} onClick={() => { setDeleteError(null); setDeleteTarget(src); }}>
                        Delete
                      </Btn>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}
      </Card>

      {/* RUNS + DEAD LETTERS side by side on wide screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* RUNS */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <SectionTitle
              right={
                <Btn onClick={loadRuns} style={{ padding: '6px 10px' }}>
                  Refresh
                </Btn>
              }
            >
              Recent runs
            </SectionTitle>
          </div>
          {runs.loading ? (
            <LoadingState label="Loading runs…" />
          ) : runs.error ? (
            <ErrorState error={runs.error} onRetry={loadRuns} />
          ) : runs.data.length === 0 ? (
            <EmptyState title="No runs yet" hint="Runs appear here once a source is triggered." />
          ) : (
            <div style={{ padding: '0 6px 6px' }}>
              <Table head={['Run', 'Status', 'Started', '']}>
                {runs.data.map((r) => {
                  const id = r._id || r.id;
                  const running = isRunning(r.status);
                  return (
                    <tr key={id} style={{ opacity: rowBusy === `run:${id}` ? 0.5 : 1 }}>
                      <Td>
                        <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12.5 }}>{shortId(id)}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>{r.sourceName || r.source || shortId(r.sourceId)}</div>
                      </Td>
                      <Td>
                        <Pill tone={runTone(r.status)}>{r.status || '—'}</Pill>
                      </Td>
                      <Td>
                        <span style={{ fontSize: 12, color: COLORS.sub }}>{fmtTime(r.startedAt || r.createdAt)}</span>
                      </Td>
                      <Td>
                        {running && (
                          <Btn
                            variant="danger"
                            disabled={!!rowBusy}
                            onClick={() =>
                              withRow(`run:${id}`, () => adminIngestionApi.cancelRun(id), 'Run cancelled.', [loadRuns])
                            }
                          >
                            Cancel
                          </Btn>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          )}
        </Card>

        {/* DEAD LETTERS */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <SectionTitle
              right={
                <Btn onClick={loadDead} style={{ padding: '6px 10px' }}>
                  Refresh
                </Btn>
              }
            >
              Dead-letters
            </SectionTitle>
          </div>
          {dead.loading ? (
            <LoadingState label="Loading dead-letters…" />
          ) : dead.error ? (
            <ErrorState error={dead.error} onRetry={loadDead} />
          ) : dead.data.length === 0 ? (
            <EmptyState icon="✓" title="No dead-letters" hint="Nothing is stuck — every item processed cleanly." />
          ) : (
            <div style={{ padding: '0 6px 6px' }}>
              <Table head={['Item', 'Reason', '']}>
                {dead.data.map((d) => {
                  const id = d._id || d.id;
                  return (
                    <tr key={id} style={{ opacity: rowBusy === `dl:${id}` ? 0.5 : 1 }}>
                      <Td>
                        <div style={{ fontFamily: 'var(--jb-font-mono)', fontSize: 12.5 }}>{shortId(id)}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>{d.sourceName || d.source || shortId(d.sourceId)}</div>
                      </Td>
                      <Td>
                        <span style={{ fontSize: 12.5, color: '#B91C1C' }}>{d.error || d.reason || 'unknown'}</span>
                      </Td>
                      <Td>
                        <Btn
                          disabled={!!rowBusy}
                          onClick={() =>
                            withRow(
                              `dl:${id}`,
                              () => adminIngestionApi.reprocessDeadLetter(id),
                              'Dead-letter re-queued.',
                              [loadDead, loadRuns],
                            )
                          }
                        >
                          Reprocess
                        </Btn>
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* CREATE SOURCE */}
      <ConfirmDialog
        open={createOpen}
        title="Add ingestion source"
        confirmLabel="Create source"
        confirmVariant="accent"
        busy={createBusy}
        error={createError}
        onConfirm={submitCreate}
        onCancel={() => {
          if (!createBusy) setCreateOpen(false);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>
              Name
            </label>
            <TextInput
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Acme Greenhouse board"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>
              Type
            </label>
            <Select
              value={createForm.type}
              onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'greenhouse', label: 'Greenhouse' },
                { value: 'lever', label: 'Lever' },
                { value: 'workday', label: 'Workday' },
              ]}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.sub, marginBottom: 6 }}>
              URL / board identifier (optional)
            </label>
            <TextInput
              value={createForm.url}
              onChange={(e) => setCreateForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://…"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* DELETE SOURCE */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete source"
        message={deleteTarget ? `Permanently delete "${deleteTarget.name || deleteTarget.type || 'this source'}"? This cannot be undone.` : ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={submitDelete}
        onCancel={() => {
          if (!deleteBusy) setDeleteTarget(null);
        }}
      />
    </AdminShell>
  );
}
