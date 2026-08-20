import { Redis } from '@upstash/redis';
import { requireAdmin, SIGNUPS_OPEN_KEY } from '../_lib/admin.js';

const redis = Redis.fromEnv();

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    // Public — the signup form itself needs this before anyone is authenticated.
    const value = await redis.get<boolean>(SIGNUPS_OPEN_KEY);
    res.status(200).json({ open: value !== false });
    return;
  }

  if (req.method === 'POST') {
    const admin = await requireAdmin(req);
    if (!admin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }
    const { open } = req.body || {};
    if (typeof open !== 'boolean') {
      res.status(400).json({ error: '"open" must be true or false.' });
      return;
    }
    await redis.set(SIGNUPS_OPEN_KEY, open);
    res.status(200).json({ ok: true, open });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
