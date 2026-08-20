import { Redis } from '@upstash/redis';
import { hashPassword, verifyPassword } from '../_lib/hash.js';
import { resolveSession, destroySession, createSession, setSessionCookie } from '../_lib/session.js';
import { ADMINS_KEY, KNOWN_HOUSEHOLDS_KEY, type AuthRecord } from '../_lib/admin.js';

const redis = Redis.fromEnv();
const SLUG_RE = /^[a-z0-9-]{3,32}$/;

/** Consolidates rename/change-password/change-slug/claim-admin into one function — Vercel's
 * Hobby plan caps a deployment at 12 serverless functions, so self-account actions that all
 * require an authenticated session share this single route, dispatched by body.action. */
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

  const { action } = req.body || {};

  if (action === 'rename') {
    const { householdName } = req.body || {};
    if (typeof householdName !== 'string' || !householdName.trim() || householdName.trim().length > 60) {
      res.status(400).json({ error: 'Household name is required (60 characters max).' });
      return;
    }
    const key = `household-finance:auth:${session.slug}`;
    const record = await redis.get<AuthRecord>(key);
    if (!record) {
      res.status(404).json({ error: 'Household not found' });
      return;
    }
    record.householdName = householdName.trim();
    await redis.set(key, record);
    res.status(200).json({ ok: true, householdName: record.householdName });
    return;
  }

  if (action === 'change-password') {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'Current and new password are required.' });
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 200) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    const key = `household-finance:auth:${session.slug}`;
    const record = await redis.get<AuthRecord>(key);
    if (!record || !verifyPassword(currentPassword, record.passwordHash, record.passwordSalt)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    const { hash, salt } = hashPassword(newPassword);
    await redis.set(key, { ...record, passwordHash: hash, passwordSalt: salt });
    res.status(200).json({ ok: true });
    return;
  }

  if (action === 'change-slug') {
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

    await redis.set(newAuthKey, authRecord);
    if (data) await redis.set(newDataKey, data);
    await redis.del(oldAuthKey);
    await redis.del(oldDataKey);
    await redis.sadd(KNOWN_HOUSEHOLDS_KEY, newSlug);
    await redis.srem(KNOWN_HOUSEHOLDS_KEY, session.slug);

    await destroySession(req);
    const token = await createSession(newSlug);
    setSessionCookie(res, token);

    res.status(200).json({ ok: true, slug: newSlug });
    return;
  }

  if (action === 'claim-admin') {
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
    return;
  }

  res.status(400).json({ error: 'Unknown action.' });
}
