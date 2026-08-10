'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Card, SectionTitle, Btn, COLORS } from '@/components/admin/AdminUI';
import { LoadingState, ErrorState, EmptyState } from '@/components/employer/EmployerStates';
import { adminMetricsApi } from '@/services/adminApi';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');

const money = (n) =>
  typeof n === 'number'
    ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';

// Turn a { key: count } map into a stable, sorted array of entries.
const entries = (obj) =>
  obj && typeof obj === 'object' ? Object.entries(obj).filter(([, v]) => v != null) : [];

function KpiCard({ label, value, sub }) {
  return (
    <Card style={{ padding: 20 }}>
      <div
        style={{
          fontFamily: 'var(--jb-font-mono)',
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: COLORS.muted,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--jb-font-mono)',
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1,
          color: COLORS.ink,
          marginBottom: sub ? 8 : 0,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.sub }}>{sub}</div>}
    </Card>
  );
}

function Breakdown({ title, data, format = fmt }) {
  const rows = entries(data);
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: COLORS.muted }}>No data.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 13.5,
              }}
            >
              <span style={{ color: COLORS.sub }}>{k}</span>
              <span style={{ fontFamily: 'var(--jb-font-mono)', fontWeight: 600, color: COLORS.ink }}>
                {format(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminMetricsApi.get();
      setMetrics(res && typeof res === 'object' ? res : null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const m = metrics || {};
  const users = m.users || {};
  const jobs = m.jobs || {};
  const applications = m.applications || {};
  const employers = m.employers || {};
  const candidates = m.candidates || {};
  const ingestion = m.ingestion || {};
  const mrr = employers.subscriptions?.mrrEstimate;

  const isEmpty =
    metrics &&
    !users.total &&
    !jobs.total &&
    !applications.total &&
    !employers.orgs &&
    !ingestion.sources;

  return (
    <AdminShell active="dashboard" title="Metrics" crumb="Admin / Metrics">
      <div style={{ marginBottom: 24 }}>
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
          Platform overview
        </h1>
        <p style={{ fontSize: 15.5, color: COLORS.sub, margin: 0 }}>
          Live operational metrics across users, jobs, applications, billing, and ingestion.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading metrics…" />
      ) : error ? (
        <ErrorState error={error} onRetry={load} />
      ) : !metrics ? (
        <EmptyState title="No metrics available" hint="The metrics endpoint returned no data." />
      ) : isEmpty ? (
        <EmptyState
          title="Nothing to report yet"
          hint="Once users sign up, jobs are ingested, and applications flow in, metrics will appear here."
          action={
            <Btn onClick={load} style={{ marginTop: 4 }}>
              Refresh
            </Btn>
          }
        />
      ) : (
        <>
          {/* KPI ROW */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <KpiCard
              label="Total users"
              value={fmt(users.total)}
              sub={`${fmt(users.active)} active · ${fmt(users.suspended)} suspended`}
            />
            <KpiCard
              label="Active jobs"
              value={fmt(jobs.active)}
              sub={`${fmt(jobs.total)} total`}
            />
            <KpiCard
              label="Applications"
              value={fmt(applications.total)}
              sub="all time"
            />
            <KpiCard
              label="Employer MRR (est.)"
              value={money(mrr)}
              sub={`${fmt(employers.orgs)} orgs`}
            />
            <KpiCard
              label="Ingestion sources"
              value={fmt(ingestion.sources)}
              sub={`${fmt(ingestion.enabled)} enabled`}
            />
          </div>

          {/* BREAKDOWNS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            <Breakdown title="Users by role" data={users.byRole} />
            <Breakdown title="Users by plan" data={users.byPlan} />
            <Breakdown title="Jobs by lifecycle" data={jobs.byLifecycle} />
            <Breakdown title="Jobs by moderation" data={jobs.byModeration} />
            <Breakdown title="Applications by status" data={applications.byStatus} />
            <Breakdown title="Employer subscriptions by plan" data={employers.subscriptions?.byPlan} />
            <Breakdown title="Candidate subscriptions" data={candidates.subscriptions} />
            <Breakdown title="Ingestion health" data={ingestion.byHealth} />
          </div>
        </>
      )}
    </AdminShell>
  );
}
