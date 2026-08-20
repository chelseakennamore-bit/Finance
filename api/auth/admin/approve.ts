import { Redis } from '@upstash/redis';
import { requireAdmin, PENDING_KEY, type AuthRecord } from '../../_lib/admin.js';
import { blankHouseholdData } from '../../_lib/blankHousehold.js';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const admin = await requireAdmin(req);
  if (!admin) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const { slug } = req.body || {};
  if (typeof slug !== 'string' || !slug) {
    res.status(400).json({ error: 'Household ID is required.' });
    return;
  }

  const authKey = `household-finance:auth:${slug}`;
  const record = await redis.get<AuthRecord>(authKey);
  if (!record) {
    res.status(404).json({ error: 'Household not found.' });
    return;
  }

  record.approved = true;
  await redis.set(authKey, record);

  const dataKey = `household-finance:data:${slug}`;
  const existingData = await redis.get(dataKey);
  if (!existingData) {
    await redis.set(dataKey, blankHouseholdData());
  }

  await redis.srem(PENDING_KEY, slug);
  res.status(200).json({ ok: true });
}
