// ============================================================
// lib/webpush.ts — VAPID key management + push notifications
//
// Uses lazy require() so the build succeeds even if web-push
// is not yet installed. Push silently no-ops until available.
// ============================================================

import { getSetting, setSetting, getPushSubscriptionsForUser } from './db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wp: any = null;

function getWebPush() {
  if (wp) return wp;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    wp = require('web-push');
    return wp;
  } catch {
    return null;
  }
}

function ensureVapidKeys(): { publicKey: string; privateKey: string } | null {
  const webpush = getWebPush();
  if (!webpush) return null;

  const pub = getSetting('vapid_public_key');
  const priv = getSetting('vapid_private_key');

  if (pub && priv) {
    webpush.setVapidDetails('mailto:admin@shiftsystem.local', pub, priv);
    return { publicKey: pub, privateKey: priv };
  }

  const keys = webpush.generateVAPIDKeys() as { publicKey: string; privateKey: string };
  setSetting('vapid_public_key', keys.publicKey);
  setSetting('vapid_private_key', keys.privateKey);
  webpush.setVapidDetails('mailto:admin@shiftsystem.local', keys.publicKey, keys.privateKey);
  return keys;
}

export function getVapidPublicKey(): string | null {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;
  const keys = ensureVapidKeys();
  return keys?.publicKey ?? null;
}

export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; tag?: string; url?: string },
): Promise<void> {
  const webpush = getWebPush();
  if (!webpush) return;

  const keys = ensureVapidKeys();
  if (!keys) return;

  const subs = getPushSubscriptionsForUser(userId);
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        data,
      ).catch((err: Error & { statusCode?: number }) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — remove it
          import('./db').then(({ removePushSubscription }) => {
            removePushSubscription(sub.endpoint);
          }).catch(() => {});
        }
      }),
    ),
  );
}
