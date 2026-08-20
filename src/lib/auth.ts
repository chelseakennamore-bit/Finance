export interface SessionInfo {
  authenticated: boolean;
  slug?: string;
  householdName?: string;
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

export async function login(slug: string, password: string): Promise<{ ok: boolean; error?: string; householdName?: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Login failed.' };
  return { ok: true, householdName: data.householdName };
}

export async function signup(
  slug: string,
  householdName: string,
  password: string
): Promise<{ ok: boolean; error?: string; householdName?: string }> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, householdName, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) return { ok: false, error: data.error || 'Sign up failed.' };
  return { ok: true };
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
