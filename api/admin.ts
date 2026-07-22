// Vercel serverless function: admin login for the custom admin page.
//
// Why this design: magazine PDFs are 10-50MB, far above Vercel's ~4.5MB request
// body limit, so uploads can't be proxied through this function. Instead, after
// a successful password login this endpoint returns the Sanity write token to
// the (now authenticated) admin browser, which uploads directly to Sanity.
// The token is never embedded in the deployed JS bundle - it only ever reaches
// the browser of someone who knows the admin password.
//
// Env vars required (set in Vercel dashboard):
//   SANITY_WRITE_TOKEN  - Sanity token with Editor permissions
//   ADMIN_PASSWORD      - the single admin's password

// Basic brute-force guard: max 5 failed attempts per IP per 15 minutes.
// In-memory - resets on cold start, which is acceptable for this scale.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.SANITY_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Server not configured (missing env vars)' });
  }

  const { password } = req.body || {};
  if (password === process.env.ADMIN_PASSWORD) {
    attempts.delete(ip);
    return res.status(200).json({ token: process.env.SANITY_WRITE_TOKEN });
  }
  recordFailure(ip);
  return res.status(401).json({ error: 'Wrong password' });
}
