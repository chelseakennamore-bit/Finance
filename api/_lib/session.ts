import { randomBytes } from 'node:crypto';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const COOKIE_NAME = 'hf_session';

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

export function setSessionCookie(res: any, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

export function clearSessionCookie(res: any): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

export async function createSession(slug: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await redis.set(`household-finance:session:${token}`, { slug }, { ex: SESSION_TTL_SECONDS });
  return token;
}

export async function resolveSession(req: any): Promise<{ slug: string } | null> {
  const cookies = parseCookies(req.headers?.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const session = await redis.get<{ slug: string }>(`household-finance:session:${token}`);
  if (!session || typeof session.slug !== 'string') return null;
  return { slug: session.slug };
}

export async function destroySession(req: any): Promise<void> {
  const cookies = parseCookies(req.headers?.cookie);
  const token = cookies[COOKIE_NAME];
  if (token) await redis.del(`household-finance:session:${token}`);
}
