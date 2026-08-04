import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const KEY = 'household-finance:data';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const data = await redis.get(KEY);
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
    await redis.set(KEY, body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
