import { Redis } from '@upstash/redis';
import { hashPassword } from '../_lib/hash.js';
import { createSession, setSessionCookie } from '../_lib/session.js';
import { blankHouseholdData } from '../_lib/blankHousehold.js';

const redis = Redis.fromEnv();
const SLUG_RE = /^[a-z0-9-]{3,32}$/;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { slug, householdName, password } = req.body || {};

  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    res.status(400).json({ error: 'Household ID must be 3-32 lowercase letters, numbers, or hyphens.' });
    return;
  }
  if (slug === 'default') {
    res.status(400).json({ error: '"default" is reserved. Pick a different household ID.' });
    return;
  }
  if (typeof householdName !== 'string' || !householdName.trim() || householdName.trim().length > 60) {
    res.status(400).json({ error: 'Household name is required (60 characters max).' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }

  const authKey = `household-finance:auth:${slug}`;
  const existing = await redis.get(authKey);
  if (existing) {
    res.status(409).json({ error: 'That household ID is already taken — try another.' });
    return;
  }

  const { hash, salt } = hashPassword(password);
  await redis.set(authKey, {
    passwordHash: hash,
    passwordSalt: salt,
    householdName: householdName.trim(),
    createdAt: new Date().toISOString(),
  });
  await redis.set(`household-finance:data:${slug}`, blankHouseholdData());

  const token = await createSession(slug);
  setSessionCookie(res, token);
  res.status(200).json({ ok: true, householdName: householdName.trim() });
}
