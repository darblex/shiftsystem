// ============================================================
// lib/rateLimit.ts — in-memory rate limiter for auth endpoints
// ============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_IP = 5;
const MAX_ATTEMPTS_PER_USERNAME = 10;

/**
 * Resolve the client IP from proxy headers.
 *
 * Why: `X-Forwarded-For: first, second, third` lists the originally-claimed
 * client first and each proxy-added entry after it. A client sitting behind
 * our proxy can spoof the leftmost value, so we trust the **last** entry —
 * that's the one our edge proxy appended. `x-real-ip` takes priority when
 * present since that's a single value our infrastructure controls.
 */
function getIp(req: Request): string {
  const headers = (req as { headers?: { get?: (name: string) => string | null } }).headers;
  if (!headers?.get) return 'unknown';

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return 'unknown';
}

function takeBucket(key: string, max: number): { allowed: boolean; retryAfterSecs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSecs: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSecs: 0 };
}

export function checkLoginRateLimit(req: Request): { allowed: boolean; retryAfterSecs: number } {
  const ip = getIp(req);
  return takeBucket(`login:ip:${ip}`, MAX_ATTEMPTS_PER_IP);
}

/**
 * Per-username throttle: slows credential-stuffing across rotating IPs.
 */
export function checkUsernameRateLimit(username: string): { allowed: boolean; retryAfterSecs: number } {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return { allowed: true, retryAfterSecs: 0 };
  return takeBucket(`login:user:${normalized}`, MAX_ATTEMPTS_PER_USERNAME);
}

export function resetLoginRateLimit(req: Request, username?: string): void {
  const ip = getIp(req);
  buckets.delete(`login:ip:${ip}`);
  if (username) {
    buckets.delete(`login:user:${username.trim().toLowerCase()}`);
  }
}

// Prune stale buckets every 30 min to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 30 * 60 * 1000);
