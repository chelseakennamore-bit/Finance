import { Redis } from '@upstash/redis';
import { requireAdmin, PENDING_KEY, SIGNUPS_OPEN_KEY, type AuthRecord } from '../_lib/admin.js';
import { blankHouseholdData } from '../_lib/blankHousehold.js';

const redis = Redis.fromEnv();

/** Consolidates the pending-list, approve, reject, and signups-open admin actions into one
 * function — Vercel's Hobby plan caps a deployment at 12 serverless functions. GET with
 * ?action=signups-open is the one public path (the signup form needs it pre-auth); everything
 * else requires an admin session. */
export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    if (req.query?.action === 'signups-open') {
      const value = await redis.get<boolean>(SIGNUPS_OPEN_KEY);
      res.status(200).json({ open: value !== false });
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
        await redis.srem(PENDING_KEY, slug);
      }
    }
    entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    res.status(200).json({ pending: entries });
    return;
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'set-signups-open') {
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

    if (action === 'approve') {
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
      if (!existingData) await redis.set(dataKey, blankHouseholdData());
      await redis.srem(PENDING_KEY, slug);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'reject') {
      // A pending account never gets a session, so it has no data to clean up beyond the auth record.
      await redis.del(`household-finance:auth:${slug}`);
      await redis.srem(PENDING_KEY, slug);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Unknown action.' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
