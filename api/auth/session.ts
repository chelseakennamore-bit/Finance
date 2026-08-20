import { Redis } from '@upstash/redis';
import { resolveSession } from '../_lib/session.js';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await resolveSession(req);
  if (!session) {
    res.status(200).json({ authenticated: false });
    return;
  }

  const record = await redis.get<{ householdName: string }>(`household-finance:auth:${session.slug}`);
  res.status(200).json({
    authenticated: true,
    slug: session.slug,
    householdName: record?.householdName || session.slug,
  });
}
