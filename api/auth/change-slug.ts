import { Redis } from '@upstash/redis';
import { resolveSession, destroySession, createSession, setSessionCookie } from '../_lib/session.js';

const redis = Redis.fromEnv();
const SLUG_RE = /^[a-z0-9-]{3,32}$/;

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

  const { newSlug } = req.body || {};
  if (typeof newSlug !== 'string' || !SLUG_RE.test(newSlug)) {
    res.status(400).json({ error: 'Household ID must be 3-32 lowercase letters, numbers, or hyphens.' });
    return;
  }
  if (newSlug === 'default') {
    res.status(400).json({ error: '"default" is reserved. Pick a different household ID.' });
    return;
  }
  if (newSlug === session.slug) {
    res.status(400).json({ error: 'That is already your household ID.' });
    return;
  }

  const oldAuthKey = `household-finance:auth:${session.slug}`;
  const oldDataKey = `household-finance:data:${session.slug}`;
  const newAuthKey = `household-finance:auth:${newSlug}`;
  const newDataKey = `household-finance:data:${newSlug}`;

  const alreadyTaken = await redis.get(newAuthKey);
  if (alreadyTaken) {
    res.status(409).json({ error: 'That household ID is already taken — try another.' });
    return;
  }

  const authRecord = await redis.get(oldAuthKey);
  if (!authRecord) {
    res.status(404).json({ error: 'Household not found.' });
    return;
  }
  const data = await redis.get(oldDataKey);

  // Write the new keys before removing the old ones, so a failure partway through
  // leaves the household reachable at at least one of the two IDs rather than neither.
  await redis.set(newAuthKey, authRecord);
  if (data) await redis.set(newDataKey, data);
  await redis.del(oldAuthKey);
  await redis.del(oldDataKey);

  await destroySession(req);
  const token = await createSession(newSlug);
  setSessionCookie(res, token);

  res.status(200).json({ ok: true, slug: newSlug });
}
