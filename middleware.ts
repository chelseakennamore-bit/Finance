export const config = {
  runtime: 'edge',
};

export default function middleware(request: Request) {
  const password = process.env.SITE_PASSWORD;

  // Fail open if no password is configured yet, so the site isn't
  // accidentally locked out before SITE_PASSWORD is set in Vercel.
  if (!password) return;

  const user = process.env.SITE_USER || 'household';
  const auth = request.headers.get('authorization');

  if (auth?.startsWith('Basic ')) {
    const [suppliedUser, suppliedPass] = atob(auth.slice(6)).split(':');
    if (suppliedUser === user && suppliedPass === password) return;
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Household Finance"',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    },
  });
}
