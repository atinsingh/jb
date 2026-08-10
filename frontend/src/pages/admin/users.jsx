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
import { adminUsersApi } from '@/services/adminApi';

const ROLES = ['ROLE_CANDIDATE', 'ROLE_EMPLOYER', 'ROLE_AGENT', 'ROLE_ADMIN'];

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  ...ROLES.map((r) => ({ value: r, label: r.replace('ROLE_', '') })),
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Suspended' },
];

const roleTone = (r) =>
  r === 'ROLE_ADMIN' ? 'amber' : r === 'ROLE_EMPLOYER' ? 'blue' : r === 'ROLE_AGENT' ? 'slate' : 'neutral';

const LIMIT = 20;

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ users: [], total: 0, page: 1, limit: LIMIT });

  // filters
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [role, setRole] = useState('');
  const [plan, setPlan] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  // action dialog: { kind, user }
  const [dialog, setDialog] = useState(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState(null);
  const [roleChoice, setRoleChoice] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState(null); // success text after an action

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminUsersApi.list({ role, q, plan, isActive, page, limit: LIMIT });
      setData({
        users: Array.isArray(res?.users) ? res.users : [],
        total: typeof res?.total === 'number' ? res.total : 0,
        page: res?.page || page,
        limit: res?.limit || LIMIT,
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [role, q, plan, isActive, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 whenever a filter changes.
  const changeFilter = (setter) => (val) => {
    setter(val);
    setPage(1);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  };

  const openDialog = (kind, user) => {
    setDialogError(null);
    setRoleChoice(user.role || ROLES[0]);
    setReason('');
    setDialog({ kind, user });
  };

  const closeDialog = () => {
    if (dialogBusy) return;
    setDialog(null);
    setDialogError(null);
  };

  const runAction = async () => {
    if (!dialog) return;
    const { kind, user } = dialog;
    setDialogBusy(true);
    setDialogError(null);
    try {
      if (kind === 'role') await adminUsersApi.setRole(user._id || user.id, roleChoice);
      else if (kind === 'suspend') await adminUsersApi.suspend(user._id || user.id, reason.trim() || undefined);
      else if (kind === 'reactivate') await adminUsersApi.reactivate(user._id || user.id);
      else if (kind === 'reset') await adminUsersApi.passwordReset(user._id || user.id);
      setDialog(null);
      setNotice(
        kind === 'reset'
          ? `Password reset triggered for ${user.email || 'user'}.`
          : kind === 'role'
          ? `Role updated for ${user.email || 'user'}.`
          : kind === 'suspend'
          ? `Suspended ${user.email || 'user'}.`
          : `Reactivated ${user.email || 'user'}.`,
      );
      await load();
    } catch (err) {
      setDialogError(err);
    } finally {
      setDialogBusy(false);
    }
  };

  const dialogConfig = () => {
    if (!dialog) return {};
    const email = dialog.user.email || 'this user';
    switch (dialog.kind) {
      case 'role':
        return { title: 'Change role', confirmLabel: 'Update role', confirmVariant: 'primary' };
      case 'suspend':
        return { title: 'Suspend user', message: `Suspend ${email}? They will lose access until reactivated.`, confirmLabel: 'Suspend', confirmVariant: 'danger' };
      case 'reactivate':
        return { title: 'Reactivate user', message: `Restore access for ${email}?`, confirmLabel: 'Reactivate', confirmVariant: 'accent' };
      case 'reset':
        return { title: 'Trigger password reset', message: `Send a password-reset for ${email}?`, confirmLabel: 'Trigger reset', confirmVariant: 'primary' };
      default:
        return {};
    }
  };

  const cfg = dialogConfig();

  const active = (u) => u.isActive !== false && u.suspended !== true;

  return (
    <AdminShell active="users" title="Users" crumb="Admin / Users">
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
          Users
        </h1>
        <p style={{ fontSize: 15.5, color: COLORS.sub, margin: 0 }}>
          Search, filter, and manage every account on the platform.
        </p>
      </div>

      {/* FILTER BAR */}
      <Card style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
            <TextInput
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search name or email…"
              style={{ flex: 1 }}
              aria-label="Search users"
            />
            <Btn type="submit" variant="primary">
              Search
            </Btn>
          </form>
          <Select value={role} onChange={(e) => changeFilter(setRole)(e.target.value)} options={ROLE_OPTIONS} />
          <TextInput
            value={plan}
            onChange={(e) => changeFilter(setPlan)(e.target.value)}
            placeholder="Plan…"
            style={{ width: 130 }}
            aria-label="Filter by plan"
          />
          <Select value={isActive} onChange={(e) => changeFilter(setIsActive)(e.target.value)} options={ACTIVE_OPTIONS} />
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

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: loading || error || data.users.length === 0 ? 0 : '6px 6px 0' }}>
          {loading ? (
            <LoadingState label="Loading users…" />
          ) : error ? (
            <ErrorState error={error} onRetry={load} />
          ) : data.users.length === 0 ? (
            <EmptyState title="No users match" hint="Try clearing filters or a different search." />
          ) : (
            <Table head={['User', 'Role', 'Plan', 'Status', 'Actions']}>
              {data.users.map((u) => {
                const id = u._id || u.id;
                const on = active(u);
                return (
                  <tr key={id}>
                    <Td>
                      <div style={{ fontWeight: 600, color: COLORS.ink }}>{u.name || '—'}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>{u.email || '—'}</div>
                    </Td>
                    <Td>
                      <Pill tone={roleTone(u.role)}>{(u.role || '—').replace('ROLE_', '')}</Pill>
                    </Td>
                    <Td>
                      <span style={{ fontSize: 12.5, color: COLORS.sub }}>{u.plan || u.subscriptionPlan || '—'}</span>
                    </Td>
                    <Td>
                      <Pill tone={on ? 'green' : 'red'}>{on ? 'Active' : 'Suspended'}</Pill>
                    </Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Btn onClick={() => openDialog('role', u)}>Role</Btn>
                        {on ? (
                          <Btn variant="danger" onClick={() => openDialog('suspend', u)}>
                            Suspend
                          </Btn>
                        ) : (
                          <Btn variant="accent" onClick={() => openDialog('reactivate', u)}>
                            Reactivate
                          </Btn>
                        )}
                        <Btn onClick={() => openDialog('reset', u)}>Reset pw</Btn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </div>
      </Card>

      {!loading && !error && data.users.length > 0 && (
        <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
      )}

      {/* ACTION DIALOG */}
      <ConfirmDialog
        open={!!dialog}
        title={cfg.title}
        message={cfg.message}
        confirmLabel={cfg.confirmLabel}
        confirmVariant={cfg.confirmVariant}
        busy={dialogBusy}
        error={dialogError}
        onConfirm={runAction}
        onCancel={closeDialog}
      >
        {dialog?.kind === 'role' && (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.sub,
                marginBottom: 6,
              }}
            >
              New role for {dialog.user.email || 'user'}
            </label>
            <Select
              value={roleChoice}
              onChange={(e) => setRoleChoice(e.target.value)}
              options={ROLES.map((r) => ({ value: r, label: r.replace('ROLE_', '') }))}
              style={{ width: '100%' }}
            />
          </div>
        )}
        {dialog?.kind === 'suspend' && (
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.sub,
                marginBottom: 6,
              }}
            >
              Reason (optional)
            </label>
            <TextInput
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. policy violation"
              style={{ width: '100%' }}
            />
          </div>
        )}
      </ConfirmDialog>
    </AdminShell>
  );
}
