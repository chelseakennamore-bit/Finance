import { Redis } from '@upstash/redis';
import { hashPassword, verifyPassword } from '../_lib/hash';
import { createSession, setSessionCookie } from '../_lib/session';

const redis = Redis.fromEnv();
const LEGACY_DATA_KEY = 'household-finance:data';

interface AuthRecord {
  passwordHash: string;
  passwordSalt: string;
  householdName: string;
  createdAt: string;
}

/** Simple per-household lockout: 10 attempts per 15 minutes. */
async function withinRateLimit(slug: string): Promise<boolean> {
  const key = `household-finance:loginattempts:${slug}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 15 * 60);
  return count <= 10;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { slug, password } = req.body || {};
  if (typeof slug !== 'string' || typeof password !== 'string' || !slug || !password) {
    res.status(400).json({ error: 'Household ID and password are required.' });
    return;
  }

  const allowed = await withinRateLimit(slug);
  if (!allowed) {
    res.status(429).json({ error: 'Too many attempts on that household ID. Try again in a few minutes.' });
    return;
  }

  let record = await redis.get<AuthRecord>(`household-finance:auth:${slug}`);

  // One-time bootstrap: the original single-household deployment used a flat SITE_PASSWORD
  // env var with no household ID at all. Let `default` log in with that password once, which
  // migrates it into the new per-household auth/data records so it behaves normally afterward.
  if (!record && slug === 'default') {
    if (!process.env.SITE_PASSWORD) {
      // Distinguishable from a real wrong-password case, without revealing anything sensitive:
      // this deployment simply doesn't have the env var the bootstrap depends on.
      res.status(401).json({
        error: 'SITE_PASSWORD is not set on this deployment — add it in Vercel → Settings → Environment Variables (scoped to Production) and redeploy, then try again.',
      });
      return;
    }
    if (password === process.env.SITE_PASSWORD) {
      const { hash, salt } = hashPassword(password);
      record = {
        passwordHash: hash,
        passwordSalt: salt,
        householdName: 'Household Finance',
        createdAt: new Date().toISOString(),
      };
      await redis.set('household-finance:auth:default', record);
      const legacyData = await redis.get(LEGACY_DATA_KEY);
      const alreadyMigrated = await redis.get('household-finance:data:default');
      if (legacyData && !alreadyMigrated) {
        await redis.set('household-finance:data:default', legacyData);
      }
    }
  }

  if (!record || !verifyPassword(password, record.passwordHash, record.passwordSalt)) {
    res.status(401).json({ error: 'Invalid household ID or password.' });
    return;
  }

  const token = await createSession(slug);
  setSessionCookie(res, token);
  res.status(200).json({ ok: true, householdName: record.householdName });
}
