'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { appRoute } from '@/components/app/appRoutes';
import { employerBillingApi } from '@/services/employerApi';
import {
  LoadingState,
  ErrorState,
  InlineError,
} from '@/components/employer/EmployerStates';

// Descriptive copy for what a full job-slot quota blocks. Not data — UI text.
const BLOCKED = [
  'New job postings are paused until a slot frees up',
  'Autopilot can’t open pipelines for new reqs',
  'Sourcing campaigns for new roles are on hold',
];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const leversToRows = (levers) =>
  Array.isArray(levers)
    ? levers.map(([label, value]) => ({ label, value: String(value) }))
    : [];

export default function EmployerQuota() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [current, setCurrent] = useState(null); // { name, rows }
  const [scale, setScale] = useState(null); // { key, name, rows }
  const [usage, setUsage] = useState(null);

  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, usageRes] = await Promise.all([
        employerBillingApi.plans(),
        employerBillingApi.usage(),
      ]);
      const plans = Array.isArray(plansRes?.plans) ? plansRes.plans : [];
      const currentPlan =
        plans.find((p) => p.current) ||
        plans.find((p) => p.key === plansRes?.currentPlan) ||
        null;
      const scalePlan = plans.find((p) => p.key === 'scale') || null;

      setCurrent(
        currentPlan
          ? { name: currentPlan.name, rows: leversToRows(currentPlan.levers) }
          : null,
      );
      setScale(
        scalePlan
          ? { key: scalePlan.key, name: scalePlan.name, rows: leversToRows(scalePlan.levers) }
          : null,
      );
      setUsage(usageRes?.usage || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const used = usage && typeof usage.jobSlotsUsed === 'number' ? usage.jobSlotsUsed : null;
  const limit = usage && typeof usage.jobSlotsLimit === 'number' ? usage.jobSlotsLimit : null;
  const atLimit = used != null && limit != null && used >= limit;
  const slotsText = used != null && limit != null ? `${used} of ${limit} used` : '—';

  const doUpgrade = async () => {
    if (!scale) return;
    setUpgrading(true);
    setUpgradeError(null);
    try {
      const res = await employerBillingApi.upgrade({
        plan: scale.key,
        billingCycle: 'annual',
      });
      // Stripe Checkout grants the plan; returning to the dashboard without
      // paying would show the old tier.
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      router.push(appRoute('Employer Dashboard.dc.html'));
    } catch (err) {
      setUpgradeError(err);
      setUpgrading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Job slots — Jobocate for Employers</title>
      </Head>

      <style jsx global>{`
        #jbquota * {
          box-sizing: border-box;
        }
        @keyframes emfade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes empop {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        #jbquota button.qbtn-primary:hover {
          background: #364fc7 !important;
        }
        #jbquota a.qbtn-ghost:hover {
          background: #f4efe4 !important;
        }
      `}</style>

      {/* dimmed app backdrop */}
      <div
        id="jbquota"
        style={{
          position: 'relative',
          minHeight: '100vh',
          background: '#F7F3EA',
          fontFamily: 'var(--jb-font-sans)',
          color: '#1B1A16',
          overflow: 'hidden',
        }}
      >
        {/* faux app shell behind */}
        <div style={{ display: 'flex', minHeight: '100vh', filter: 'blur(2px)', opacity: 0.5, pointerEvents: 'none' }}>
          <div style={{ width: 250, flexShrink: 0, background: '#15140F' }} />
          <div style={{ flex: 1, padding: 32 }}>
            <div style={{ height: 40, width: 280, background: '#EFE8DA', borderRadius: 10, marginBottom: 24 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              <div style={{ height: 130, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }} />
              <div style={{ height: 130, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }} />
              <div style={{ height: 130, background: '#FFFEFB', border: '1px solid #E6DECF', borderRadius: 16 }} />
            </div>
          </div>
        </div>

        {/* scrim */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(16,15,11,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'emfade 0.2s ease',
          }}
        >
          {/* DIALOG */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 520,
              background: '#FFFEFB',
              border: '1px solid #E6DECF',
              borderRadius: 24,
              boxShadow: '0 50px 100px -40px rgba(0,0,0,0.6)',
              padding: 36,
              animation: 'empop 0.28s ease',
            }}
          >
            <Link
              href={appRoute('Employer Dashboard.dc.html')}
              title="Close"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #E6DECF',
                borderRadius: 9,
                color: '#8A8378',
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              ✕
            </Link>

            {loading ? (
              <LoadingState label="Loading plan limits…" />
            ) : error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: '#EDF0FE',
                    color: '#4263EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    marginBottom: 20,
                  }}
                >
                  ◓
                </div>

                <div
                  style={{
                    fontFamily: 'var(--jb-font-mono)',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#4263EB',
                    marginBottom: 10,
                  }}
                >
                  Job slots · {slotsText}
                </div>
                <h1 style={{ fontFamily: 'var(--jb-font-display)', fontWeight: 400, fontSize: 30, lineHeight: 1.08, margin: '0 0 10px' }}>
                  {atLimit
                    ? 'You’ve filled every job slot — nice problem to have.'
                    : 'Keep an eye on your job slots.'}
                </h1>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: '#5A544A', margin: '0 0 22px' }}>
                  Your {current?.name || 'current'} plan includes {limit ?? '—'} active reqs
                  {atLimit ? ' and all are live' : used != null ? `, ${used} in use` : ''}. To post
                  more, free up a slot{scale ? ` or move up to ${scale.name}` : ''}.
                </p>

                {/* WHAT'S BLOCKED */}
                {atLimit && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
                    {BLOCKED.map((b) => (
                      <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, color: '#5A544A' }}>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            borderRadius: '50%',
                            background: '#FBEDE4',
                            color: '#C9622E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                          }}
                        >
                          ○
                        </span>
                        {b}
                      </div>
                    ))}
                  </div>
                )}

                {/* TIER COMPARE */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={{ background: '#FBF8F1', border: '1px solid #E1D9C9', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1B1A16' }}>{current?.name || '—'}</span>
                      <span
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#157A49',
                          background: '#EAF6EE',
                          border: '1px solid #CDE9D6',
                          padding: '2px 6px',
                          borderRadius: 999,
                        }}
                      >
                        CURRENT
                      </span>
                    </div>
                    {(current?.rows || []).map((g) => (
                      <div
                        key={g.label}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: '#5A544A', marginBottom: 7 }}
                      >
                        <span>{g.label}</span>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontWeight: 600, color: '#1B1A16' }}>{g.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#15140F', border: '1px solid #4263EB', borderRadius: 14, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#FBF8F1' }}>{scale?.name || 'Scale'}</span>
                      <span
                        style={{
                          fontFamily: 'var(--jb-font-mono)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#fff',
                          background: '#4263EB',
                          padding: '2px 6px',
                          borderRadius: 999,
                        }}
                      >
                        UPGRADE
                      </span>
                    </div>
                    {(scale?.rows || []).map((s) => (
                      <div
                        key={s.label}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: '#9A9286', marginBottom: 7 }}
                      >
                        <span>{s.label}</span>
                        <span style={{ fontFamily: 'var(--jb-font-mono)', fontWeight: 600, color: '#5BD08C' }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <InlineError error={upgradeError} />

                {/* ACTIONS */}
                {scale && (
                  <button
                    onClick={doUpgrade}
                    disabled={upgrading}
                    className="qbtn-primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: '#4263EB',
                      color: '#fff',
                      border: 'none',
                      fontFamily: 'inherit',
                      fontSize: 15,
                      fontWeight: 700,
                      padding: 14,
                      borderRadius: 999,
                      cursor: upgrading ? 'not-allowed' : 'pointer',
                      opacity: upgrading ? 0.7 : 1,
                      marginBottom: 10,
                    }}
                  >
                    {upgrading ? 'Upgrading…' : `Upgrade to ${scale.name} →`}
                  </button>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link
                    href={appRoute('Employer Jobs.dc.html')}
                    className="qbtn-ghost"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#FFFEFB',
                      color: '#1B1A16',
                      fontSize: 14,
                      fontWeight: 600,
                      padding: 12,
                      borderRadius: 999,
                      textDecoration: 'none',
                      border: '1px solid #D9D0BE',
                    }}
                  >
                    Manage jobs
                  </Link>
                </div>

                <p style={{ fontSize: 12, color: '#A79E8F', textAlign: 'center', margin: '16px 0 0' }}>
                  Closing a req keeps all its candidates and data — it just frees the slot.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
