import { destroySession, clearSessionCookie } from '../_lib/session';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  await destroySession(req);
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
