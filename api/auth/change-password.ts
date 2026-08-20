import { Redis } from '@upstash/redis';
import { hashPassword, verifyPassword } from '../_lib/hash.js';
import { resolveSession } from '../_lib/session.js';

const redis = Redis.fromEnv();

interface AuthRecord {
  passwordHash: string;
  passwordSalt: string;
  householdName: string;
  createdAt: string;
}

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
}
