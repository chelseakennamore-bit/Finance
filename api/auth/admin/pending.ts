import { Redis } from '@upstash/redis';
import { requireAdmin, PENDING_KEY, type AuthRecord } from '../../_lib/admin.js';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const admin = await requireAdmin(req);
  if (!admin) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  const slugs = await redis.smembers(PENDING_KEY);
  const entries: { slug: string; householdName: string; createdAt: string }[] = [];
  for (const slug of slugs) {
    const record = await redis.get<AuthRecord>(`household-finance:auth:${slug}`);
    if (record && record.approved === false) {
      entries.push({ slug, householdName: record.householdName, createdAt: record.createdAt });
    } else {
      // Stale entry (already approved/rejected some other way) — tidy it up.
      await redis.srem(PENDING_KEY, slug);
    }
  }
  entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  res.status(200).json({ pending: entries });
}
