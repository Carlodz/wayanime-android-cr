/* كاش الصور (cache-first) باش البوسترات تبان فوراً بلا إعادة تحميل */
const C = 'wa-img-v1', MAX = 400;
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C && k.indexOf('wa-img-') === 0).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.destination !== 'image' || !/^https?:/i.test(r.url)) return;
  e.respondWith(caches.open(C).then(async (c) => {
    const hit = await c.match(r);
    if (hit) return hit;
    try {
      const res = await fetch(r);
      if (res && (res.ok || res.type === 'opaque')) { c.put(r, res.clone()).then(() => c.keys()).then((ks) => { if (ks.length > MAX) ks.slice(0, ks.length - MAX).forEach((k) => c.delete(k)); }).catch(() => {}); }
      return res;
    } catch (err) { return hit || Response.error(); }
  }));
});
