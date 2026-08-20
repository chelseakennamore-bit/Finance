export interface SessionInfo {
  authenticated: boolean;
  slug?: string;
  householdName?: string;
  isAdmin?: boolean;
}

export interface PendingHousehold {
  slug: string;
  householdName: string;
  createdAt: string;
}

async function parseJson(res: Response): Promise<any> {
  return res.json().catch(() => ({}));
}

export async function checkSession(): Promise<SessionInfo> {
  try {
    const res = await fetch('/api/auth/session');
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch {
    return { authenticated: false };
  }
}

export async function login(
  slug: string,
  password: string
): Promise<{ ok: boolean; error?: string; householdName?: string; isAdmin?: boolean }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Login failed.' };
  return { ok: true, householdName: data.householdName, isAdmin: data.isAdmin === true };
}

export async function signup(
  slug: string,
  householdName: string,
  password: string
): Promise<{ ok: boolean; error?: string; pending?: boolean; householdName?: string }> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, householdName, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Sign up failed.' };
  return { ok: true, pending: data.pending === true, householdName: data.householdName };
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function renameHousehold(householdName: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ householdName }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Rename failed.' };
  return { ok: true };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Could not change password.' };
  return { ok: true };
}

export async function changeSlug(newSlug: string): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const res = await fetch('/api/auth/change-slug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newSlug }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Could not change household ID.' };
  return { ok: true, slug: data.slug };
}

export async function claimAdmin(password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/claim-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Could not claim admin access.' };
  return { ok: true };
}

export async function getSignupsOpen(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/signups-open');
    if (!res.ok) return true;
    const data = await res.json();
    return data.open !== false;
  } catch {
    return true;
  }
}

export async function setSignupsOpen(open: boolean): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/signups-open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ open }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Could not update signups setting.' };
  return { ok: true };
}

export async function listPending(): Promise<PendingHousehold[]> {
  const res = await fetch('/api/auth/admin/pending');
  if (!res.ok) return [];
  const data = await parseJson(res);
  return Array.isArray(data.pending) ? data.pending : [];
}

export async function approveHousehold(slug: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/admin/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Could not approve household.' };
  return { ok: true };
}

export async function rejectHousehold(slug: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/auth/admin/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Could not reject household.' };
  return { ok: true };
}
