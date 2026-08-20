import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { changePassword, changeSlug, claimAdmin } from '../lib/auth';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function ChangeSlugForm() {
  const householdSlug = useFinanceStore((s) => s.householdSlug);
  const [newSlug, setNewSlug] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newSlug.trim()) {
      setError('Enter a new household ID.');
      return;
    }
    setSubmitting(true);
    const result = await changeSlug(newSlug);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Something went wrong.');
      return;
    }
    // The session cookie now points at the new slug — reload so everything (session check,
    // hydrate) picks it up cleanly instead of trying to patch React/store state in place.
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-3">
      <div className="text-[11px] text-sidebar-muted">
        Household ID (currently <span className="font-mono">{householdSlug}</span>) — this is what you log in with.
      </div>
      <input
        value={newSlug}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSlug(slugify(e.target.value))}
        placeholder="kennamore"
        className="w-full px-2 py-1.5 rounded-md text-[13px] font-mono bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
      />
      {error && <div className="text-[11px]" style={{ color: 'oklch(70% 0.16 25)' }}>{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="px-2 py-1.5 rounded-md text-[12px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Change household ID'}
      </button>
    </form>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!currentPassword || !newPassword) {
      setError('Fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSubmitting(true);
    const result = await changePassword(currentPassword, newPassword);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Something went wrong.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4">
      <div className="text-[11px] text-sidebar-muted">Change password</div>
      <input
        type="password"
        value={currentPassword}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
        className="w-full px-2 py-1.5 rounded-md text-[13px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
        placeholder="New password"
        className="w-full px-2 py-1.5 rounded-md text-[13px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        className="w-full px-2 py-1.5 rounded-md text-[13px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
      />
      {error && <div className="text-[11px]" style={{ color: 'oklch(70% 0.16 25)' }}>{error}</div>}
      {success && <div className="text-[11px]" style={{ color: 'oklch(70% 0.1 145)' }}>Password updated.</div>}
      <button
        type="submit"
        disabled={submitting}
        className="px-2 py-1.5 rounded-md text-[12px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : 'Update password'}
      </button>
    </form>
  );
}

function ClaimAdminForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Enter the site password.');
      return;
    }
    setSubmitting(true);
    const result = await claimAdmin(password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Something went wrong.');
      return;
    }
    window.location.reload();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-4">
      <div className="text-[11px] text-sidebar-muted">
        Claim admin access (one-time, using the original site password) to approve new signups and manage who can
        join.
      </div>
      <input
        type="password"
        value={password}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
        placeholder="Site password"
        className="w-full px-2 py-1.5 rounded-md text-[13px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title"
      />
      {error && <div className="text-[11px]" style={{ color: 'oklch(70% 0.16 25)' }}>{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="px-2 py-1.5 rounded-md text-[12px] bg-sidebar-input-bg border border-sidebar-input-border text-sidebar-title cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Claiming…' : 'Claim admin access'}
      </button>
    </form>
  );
}

export function AccountSettings() {
  const [open, setOpen] = useState(false);
  const isAdmin = useFinanceStore((s) => s.isAdmin);

  return (
    <div className="pt-3.5 px-3 text-[11px] text-sidebar-muted border-t border-sidebar-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center cursor-pointer bg-transparent border-none p-0 text-sidebar-muted text-[11px]"
      >
        <span>Account settings</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <>
          <ChangeSlugForm />
          <ChangePasswordForm />
          {!isAdmin && <ClaimAdminForm />}
        </>
      )}
    </div>
  );
}
