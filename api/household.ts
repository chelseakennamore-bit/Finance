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
    await redis.set(KEY, req.body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
