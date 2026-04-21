'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

type State = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushNotificationToggle() {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'subscribed' : 'unsubscribed');
    }).catch(() => setState('unsubscribed'));
  }, []);

  // Register the service worker once on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const keyRes = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json() as { publicKey: string };

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setState('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subJson),
      });
      setState('subscribed');
    } catch {
      // Permission denied or error
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        await sub.unsubscribe();
      }
      setState('unsubscribed');
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading' || state === 'unsupported') return null;

  if (state === 'denied') {
    return (
      <button
        disabled
        title="הרשאת התראות נדחתה בדפדפן"
        className="btn-secondary opacity-50 cursor-not-allowed"
      >
        <BellOff className="w-4 h-4" />
        <span className="hidden sm:inline">התראות נחסמו</span>
      </button>
    );
  }

  if (state === 'subscribed') {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        title="בטל רישום להתראות"
        className="btn-secondary"
        style={{ borderColor: 'rgba(34,197,94,0.4)', color: '#4ade80' }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        <span className="hidden sm:inline">התראות פעילות</span>
      </button>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={busy}
      title="הפעל התראות לתורנויות"
      className="btn-secondary"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
      <span className="hidden sm:inline">הפעל התראות</span>
    </button>
  );
}
