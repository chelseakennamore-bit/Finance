import { Redis } from '@upstash/redis';
import { requireAdmin, PENDING_KEY } from '../../_lib/admin.js';

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

  // A pending account never gets a session, so it has no data to clean up beyond the auth record.
  await redis.del(`household-finance:auth:${slug}`);
  await redis.srem(PENDING_KEY, slug);
  res.status(200).json({ ok: true });
}
