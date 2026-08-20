/** Best-effort email notification via Resend's REST API (no SDK dependency needed).
 * Silently no-ops if RESEND_API_KEY/NOTIFY_EMAIL aren't configured, and never throws — a
 * notification failure should never block the signup it's reporting on. */
export async function sendSignupNotification(householdName: string, slug: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM_EMAIL || 'Household Finance <onboarding@resend.dev>',
        to,
        subject: `Household Finance: new access request from ${householdName}`,
        text: `"${householdName}" (household ID: ${slug}) just requested access to Household Finance.\n\nApprove or reject it from the Admin panel in the sidebar after logging in.`,
      }),
    });
    if (!res.ok) {
      console.error('Signup notification email failed', res.status, await res.text().catch(() => ''));
    }
  } catch (e) {
    console.error('Signup notification email failed', e);
  }
}
