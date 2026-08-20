import { Redis } from '@upstash/redis';
import { resolveSession } from '../_lib/session.js';
import { ADMINS_KEY, type AuthRecord } from '../_lib/admin.js';

const redis = Redis.fromEnv();

/** One-time, self-service way to become the app's admin: works for whichever household you're
 * currently logged into (regardless of household ID), gated by the same SITE_PASSWORD used for
 * the original single-household deployment, and only while no admin has been claimed yet. */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await resolveSession(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (!process.env.SITE_PASSWORD) {
    res.status(400).json({ error: 'SITE_PASSWORD is not set on this deployment.' });
    return;
  }

  const { password } = req.body || {};
  if (password !== process.env.SITE_PASSWORD) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const existingAdminCount = await redis.scard(ADMINS_KEY);
  if (existingAdminCount > 0) {
    res.status(409).json({ error: 'Admin access has already been claimed for this deployment.' });
    return;
  }

  const authKey = `household-finance:auth:${session.slug}`;
  const record = await redis.get<AuthRecord>(authKey);
  if (!record) {
    res.status(404).json({ error: 'Household not found.' });
    return;
  }

  record.isAdmin = true;
  record.approved = true;
  await redis.set(authKey, record);
  await redis.sadd(ADMINS_KEY, session.slug);

  res.status(200).json({ ok: true });
}
