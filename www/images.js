/* إصلاح صور البوستر اللي ما كتطلعش (حماية hotlink/Referer): كيعاود يجيبها بـ HTTP الأصلي ديال Android */
(function () {
  const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
  const call = (o) => { const C = window.Capacitor; if (!C) return Promise.reject(); return (C.Plugins && C.Plugins.CapacitorHttp && C.Plugins.CapacitorHttp.request) ? C.Plugins.CapacitorHttp.request(o) : C.nativePromise('CapacitorHttp', 'request', o); };
  const cache = new Map();

  async function load(u) {
    if (cache.has(u)) return cache.get(u);
    let origin = ''; try { origin = new URL(u).origin + '/'; } catch (e) { return null; }
    const refs = [origin];
    try { if (typeof WIT !== 'undefined') refs.push(new URL(WIT).origin + '/'); } catch (e) {}
    for (const ref of refs) {
      try {
        const r = await call({ url: u, method: 'GET', headers: { Referer: ref, 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' }, responseType: 'blob', connectTimeout: 15000, readTimeout: 25000 });
        if (r && r.status >= 200 && r.status < 300 && typeof r.data === 'string' && r.data.length > 100) {
          const h = r.headers || {}; let ct = 'image/jpeg';
          for (const k in h) if (k.toLowerCase() === 'content-type') ct = String(h[k]).split(';')[0];
          if (!/^image\//i.test(ct)) ct = 'image/jpeg';
          const d = 'data:' + ct + ';base64,' + r.data; cache.set(u, d); return d;
        }
      } catch (e) {}
    }
    return null;
  }


  /* سرعة: فك ترميز الصور بشكل غير متزامن + هيكل لامع حتى تجي الصورة */
  const st = document.createElement('style');
  st.textContent = '.card img,.smrow img,.ch img{background:linear-gradient(110deg,#171230 8%,#241c45 18%,#171230 33%);background-size:200% 100%;animation:waShim 1.3s linear infinite}@keyframes waShim{to{background-position-x:-200%}}.card img{content-visibility:auto}';
  document.head.appendChild(st);
  const fix = (n) => { if (n.nodeType !== 1) return; const l = n.tagName === 'IMG' ? [n] : n.querySelectorAll ? n.querySelectorAll('img') : []; l.forEach((i) => { i.decoding = 'async'; if (!i.hasAttribute('fetchpriority') && !i.closest('.hero,.hslide')) i.fetchPriority = 'low'; }); };
  new MutationObserver((m) => m.forEach((r) => r.addedNodes.forEach(fix))).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('error', async (e) => {
    const i = e.target;
    if (!(i instanceof HTMLImageElement) || i.dataset.wfix) return;
    const u = i.currentSrc || i.getAttribute('src') || '';
    if (!/^https?:/i.test(u)) return;
    i.dataset.wfix = '1';
    const d = await load(u);
    if (d) i.src = d;
  }, true);
})();
