import { Redis } from '@upstash/redis';
import { resolveSession } from '../_lib/session.js';

const redis = Redis.fromEnv();

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

  const { householdName } = req.body || {};
  if (typeof householdName !== 'string' || !householdName.trim() || householdName.trim().length > 60) {
    res.status(400).json({ error: 'Household name is required (60 characters max).' });
    return;
  }

  const key = `household-finance:auth:${session.slug}`;
  const record = await redis.get<any>(key);
  if (!record) {
    res.status(404).json({ error: 'Household not found' });
    return;
  }

  record.householdName = householdName.trim();
  await redis.set(key, record);
  res.status(200).json({ ok: true, householdName: record.householdName });
}
