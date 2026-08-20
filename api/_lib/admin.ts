import { Redis } from '@upstash/redis';
import { resolveSession } from './session.js';

const redis = Redis.fromEnv();

export const ADMINS_KEY = 'household-finance:admins';
export const PENDING_KEY = 'household-finance:pending-signups';
export const SIGNUPS_OPEN_KEY = 'household-finance:settings:signups-open';

export interface AuthRecord {
  passwordHash: string;
  passwordSalt: string;
  householdName: string;
  createdAt: string;
  /** Explicit false means awaiting approval. Missing entirely means this account predates the
   * approval system and is grandfathered in as already-approved. */
  approved?: boolean;
  isAdmin?: boolean;
}

/** Resolves the session and confirms the account is an admin. Returns null otherwise. */
export async function requireAdmin(req: any): Promise<{ slug: string; record: AuthRecord } | null> {
  const session = await resolveSession(req);
  if (!session) return null;
  const record = await redis.get<AuthRecord>(`household-finance:auth:${session.slug}`);
  if (!record || record.isAdmin !== true) return null;
  return { slug: session.slug, record };
}
