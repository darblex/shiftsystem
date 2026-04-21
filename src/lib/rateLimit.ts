// ============================================================
// lib/rateLimit.ts — simple in-memory rate limiter
// ============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function getIp(req: Request): string {
  const xff = (req as any).headers?.get?.('x-forwarded-for') as string | null;
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

export function checkLoginRateLimit(req: Request): { allowed: boolean; retryAfterSecs: number } {
  const ip = getIp(req);
  const now = Date.now();
  const key = `login:${ip}`;

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    const retryAfterSecs = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfterSecs };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSecs: 0 };
}

export function resetLoginRateLimit(req: Request): void {
  const ip = getIp(req);
  buckets.delete(`login:${ip}`);
}

// Prune stale buckets every 30 min to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 30 * 60 * 1000);
