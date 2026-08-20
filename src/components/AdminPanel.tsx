import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  approveHousehold,
  getSignupsOpen,
  listHouseholds,
  listPending,
  rejectHousehold,
  resetPassword,
  revokeHousehold,
  setSignupsOpen,
  type ApprovedHousehold,
  type PendingHousehold,
} from '../lib/auth';
import { useFinanceStore } from '../store/financeStore';

export function AdminPanel() {
  const mySlug = useFinanceStore((s) => s.householdSlug);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingHousehold[]>([]);
  const [households, setHouseholds] = useState<ApprovedHousehold[]>([]);
  const [signupsOpen, setSignupsOpenState] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = async () => {
    setLoading(true);
    const [pendingList, open_, householdList] = await Promise.all([listPending(), getSignupsOpen(), listHouseholds()]);
    setPending(pendingList);
    setSignupsOpenState(open_);
    setHouseholds(householdList);
    setLoading(false);
  };

  // Fetch once on mount so the pending-count badge is visible before the panel is ever opened,
  // and again each time it's opened in case time has passed since the last check.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleToggleSignups = async (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setSignupsOpenState(next); // optimistic
    const result = await setSignupsOpen(next);
    if (!result.ok) {
      setError(result.error || 'Could not update.');
      setSignupsOpenState(!next);
    }
  };

  const handleApprove = async (slug: string) => {
    setError('');
    setBusySlug(slug);
    const result = await approveHousehold(slug);
    setBusySlug(null);
    if (!result.ok) {
      setError(result.error || 'Could not approve.');
      return;
    }
    setPending((p) => p.filter((h) => h.slug !== slug));
  };

  const handleReject = async (slug: string) => {
    setError('');
    if (!confirm(`Reject and permanently delete the "${slug}" signup request?`)) return;
    setBusySlug(slug);
    const result = await rejectHousehold(slug);
    setBusySlug(null);
    if (!result.ok) {
      setError(result.error || 'Could not reject.');
      return;
    }
    setPending((p) => p.filter((h) => h.slug !== slug));
  };

  const handleRevoke = async (slug: string) => {
    setError('');
    if (!confirm(`Revoke access for "${slug}"? This permanently deletes their login and household data.`)) return;
    setBusySlug(slug);
    const result = await revokeHousehold(slug);
    setBusySlug(null);
    if (!result.ok) {
      setError(result.error || 'Could not revoke access.');
      return;
    }
    setHouseholds((h) => h.filter((x) => x.slug !== slug));
  };

  const handleResetPassword = async (slug: string) => {
    setError('');
    if (!confirm(`Reset the password for "${slug}"? Their current password will stop working immediately.`)) return;
    setBusySlug(slug);
    const result = await resetPassword(slug);
    setBusySlug(null);
    if (!result.ok) {
      setError(result.error || 'Could not reset password.');
      return;
    }
    alert(`New password for "${slug}":\n\n${result.newPassword}\n\nShare this with them now — it won't be shown again.`);
  };

  return (
    <div className="pt-3.5 px-3 text-[11px] text-sidebar-muted border-t border-sidebar-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center cursor-pointer bg-transparent border-none p-0 text-sidebar-muted text-[11px]"
      >
        <span>
          Admin{pending.length > 0 && !open ? ` (${pending.length})` : ''}
        </span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={signupsOpen} onChange={handleToggleSignups} />
            <span>Allow new signups</span>
          </label>

          {error && <div style={{ color: 'oklch(70% 0.16 25)' }}>{error}</div>}

          <div>
            <div className="mb-1.5">Pending requests{loading ? ' (loading…)' : ''}</div>
            {!loading && pending.length === 0 && <div className="text-sidebar-muted">None right now.</div>}
            <div className="flex flex-col gap-2">
              {pending.map((h) => (
                <div key={h.slug} className="rounded-md border border-sidebar-input-border p-2 bg-sidebar-input-bg">
                  <div className="text-sidebar-title font-mono">{h.slug}</div>
                  <div className="text-sidebar-muted">{h.householdName}</div>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => handleApprove(h.slug)}
                      disabled={busySlug === h.slug}
                      className="flex-1 px-2 py-1 rounded text-[11px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(h.slug)}
                      disabled={busySlug === h.slug}
                      className="flex-1 px-2 py-1 rounded text-[11px] bg-sidebar-input-bg border border-sidebar-input-border cursor-pointer disabled:opacity-50"
                      style={{ color: 'oklch(70% 0.16 25)' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5">Households{loading ? ' (loading…)' : ''}</div>
            {!loading && households.length === 0 && <div className="text-sidebar-muted">None yet.</div>}
            <div className="flex flex-col gap-2">
              {households.map((h) => (
                <div key={h.slug} className="rounded-md border border-sidebar-input-border p-2 bg-sidebar-input-bg">
                  <div className="text-sidebar-title font-mono">{h.slug}</div>
                  <div className="text-sidebar-muted">
                    {h.householdName}
                    {h.isAdmin ? ' (admin)' : ''}
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => handleResetPassword(h.slug)}
                      disabled={busySlug === h.slug}
                      className="flex-1 px-2 py-1 rounded text-[11px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer disabled:opacity-50"
                    >
                      Reset password
                    </button>
                    {h.slug !== mySlug && (
                      <button
                        onClick={() => handleRevoke(h.slug)}
                        disabled={busySlug === h.slug}
                        className="flex-1 px-2 py-1 rounded text-[11px] bg-sidebar-input-bg border border-sidebar-input-border cursor-pointer disabled:opacity-50"
                        style={{ color: 'oklch(70% 0.16 25)' }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
