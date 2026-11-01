// كاش البوسترات: كل صورة من الإنترنت كتتحمل مرة وحدة وكتتحفظ فـ الجهاز، من بعد كتبان فوراً (حتى بلا إنترنت)
const CACHE = 'wa-posters-v1', MAX = 900;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
let puts = 0;
async function trim(c) { const ks = await c.keys(); if (ks.length > MAX) for (const k of ks.slice(0, ks.length - MAX)) await c.delete(k); }
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.destination !== 'image') return;
  const u = new URL(r.url);
  if (!/^https?:$/.test(u.protocol) || u.origin === self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(r.url);
    if (hit) return hit;
    try {
      const res = await fetch(r.url, { mode: 'cors', credentials: 'omit' });
      if (res.ok) { c.put(r.url, res.clone()).then(() => { if (++puts % 40 === 0) trim(c); }).catch(() => {}); return res; }
    } catch {}
    return fetch(r);
  })());
});
