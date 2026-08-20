import { Redis } from '@upstash/redis';
import { resolveSession } from './_lib/session';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  const session = await resolveSession(req);
  if (!session) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const key = `household-finance:data:${session.slug}`;

  if (req.method === 'GET') {
    const data = await redis.get(key);
    res.status(200).json({ data: data ?? null });
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }
    if (JSON.stringify(body).length > 2_000_000) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }
    await redis.set(key, body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
