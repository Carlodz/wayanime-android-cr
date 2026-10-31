/* تحميل حقيقي للحلقات (mp4 مباشر + HLS/m3u8) والمشاهدة بلا نت — Capacitor Filesystem */
(function () {
  const LS = 'wa_dl_v2';
  const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
  const cap = () => window.Capacitor;
  const FS = () => cap() && cap().Plugins && cap().Plugins.Filesystem;
  const list = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } };
  const save = (a) => { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {} };
  const fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(0) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
  const ICON_DL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" opacity=".35"/><path d="M12 7v8M8.5 12l3.5 3.5 3.5-3.5"/></svg>';
  let busy = false, cancelled = false;

  const css = document.createElement('style');
  css.textContent =
    '.streams button.dlb{background:linear-gradient(135deg,#7b4dff,#5b2fe0)!important;border:0!important;color:#fff!important;font-weight:800;box-shadow:0 8px 22px #5b2fe055}' +
    '.streams button.dlb svg{width:22px;height:22px;flex:none;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#dlBar{position:fixed;z-index:9500;inset-inline:12px;bottom:calc(86px + env(safe-area-inset-bottom,0px));background:#120e2bf2;border:1px solid #7b4dff55;border-radius:16px;padding:10px 14px;color:#fff;font-size:13px;font-weight:700;direction:rtl;box-shadow:0 10px 30px #000a}' +
    '#dlBar .r{display:flex;align-items:center;justify-content:space-between;gap:10px}#dlBar button{background:#ffffff1f;border:0;color:#fff;border-radius:10px;padding:5px 12px;font-size:12px}' +
    '#dlBar i{display:block;height:5px;border-radius:3px;background:#ffffff22;margin-top:8px;overflow:hidden}#dlBar i b{display:block;height:100%;width:0;background:#7b4dff;transition:width .3s}' +
    '#dlPage{padding:6px var(--gut,14px) 0;direction:rtl}#dlPage .cth{margin:4px 0 14px;font-size:22px;font-weight:900}' +
    '#dlPage .dli{display:flex;align-items:center;gap:10px;background:var(--panel,#16122e);border:1px solid var(--line,#ffffff1a);border-radius:16px;padding:10px 12px;margin-bottom:10px}' +
    '#dlPage .dli .tx{flex:1;min-width:0;cursor:pointer}#dlPage .dli b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#dlPage .dli small{color:var(--mute,#9a98b5);font-size:12px}' +
    '#dlPage .dli button{background:none;border:0;color:#fff;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center}' +
    '#dlPage .dli button.pl{background:#7b4dff;border-radius:50%}#dlPage .dli button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#dlPage .dle{text-align:center;color:var(--mute,#9a98b5);padding:60px 10px;font-size:14px;line-height:1.9}';
  document.head.appendChild(css);

  const http = (o) => { const C = cap(); return (C.Plugins && C.Plugins.CapacitorHttp && C.Plugins.CapacitorHttp.request) ? C.Plugins.CapacitorHttp.request(o) : C.nativePromise('CapacitorHttp', 'request', o); };
  async function getText(url, headers) {
    const r = await http({ url, method: 'GET', headers: { 'User-Agent': UA, ...(headers || {}) }, responseType: 'text', connectTimeout: 20000, readTimeout: 30000 });
    if (!r || r.status < 200 || r.status >= 300) throw new Error('http ' + (r && r.status));
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  }

  /* يرجّع {url, headers, hls} أو null */
  async function direct(u) {
    if (/mediafire\./i.test(hostOf(u))) {
      const d = window.api && window.api.ar && window.api.ar.direct ? await window.api.ar.direct(u).catch(() => null) : null;
      return d ? { url: typeof d === 'string' ? d : d.url, headers: d && d.headers, hls: false } : null;
    }
    if (/\.m3u8|master\.txt/i.test(u)) return { url: u, hls: true };
    if (/\.(mp4|webm|mkv)(\?|$)/i.test(u)) return { url: u, hls: false };
    const rh = await window.api.resolveHost(u).catch(() => null);
    if (!rh || !rh.url) return null;
    return { url: rh.url, headers: rh.headers, hls: !!rh.hls || /\.m3u8|master\.txt/i.test(rh.url) };
  }

  function bar(txt, p, onCancel) {
    let b = document.getElementById('dlBar');
    if (txt === null) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'dlBar'; b.innerHTML = '<div class="r"><span></span><button type="button">إلغاء</button></div><i><b></b></i>'; document.body.appendChild(b); b.querySelector('button').onclick = () => { cancelled = true; }; }
    b.querySelector('span').textContent = txt;
    b.querySelector('b').style.width = Math.max(0, Math.min(100, p || 0)) + '%';
  }

  const absU = (u, b) => { try { return new URL(u, b).href; } catch (e) { return u; } };

  async function downloadFile(fs, url, path, headers) {
    for (let t = 0; t < 3; t++) {
      if (cancelled) throw new Error('cancel');
      try { await fs.downloadFile({ url, path, directory: 'DATA', recursive: true, headers: { 'User-Agent': UA, ...(headers || {}) } }); return; }
      catch (e) { if (t === 2) throw e; await new Promise((r) => setTimeout(r, 800 * (t + 1))); }
    }
  }

  async function dlHls(fs, src, id, label) {
    let url = src.url, txt = await getText(url, src.headers);
    if (/#EXT-X-STREAM-INF/.test(txt)) {                       // master → نختار جودة ≤ 720
      const L = txt.split(/\r?\n/), vs = [];
      for (let i = 0; i < L.length; i++) if (L[i].startsWith('#EXT-X-STREAM-INF')) {
        const h = +((L[i].match(/RESOLUTION=\d+x(\d+)/) || [])[1] || 0), bw = +((L[i].match(/BANDWIDTH=(\d+)/) || [])[1] || 0);
        let j = i + 1; while (j < L.length && (!L[j] || L[j][0] === '#')) j++;
        if (L[j]) vs.push({ h, bw, u: absU(L[j].trim(), url) });
      }
      if (!vs.length) throw new Error('no variants');
      const ok = vs.filter((v) => v.h && v.h <= 720).sort((a, b) => b.h - a.h || b.bw - a.bw);
      const pick = ok[0] || vs.sort((a, b) => a.bw - b.bw)[0];
      url = pick.u; txt = await getText(url, src.headers);
    }
    const dir = 'downloads/' + id, lines = txt.split(/\r?\n/), out = [], segs = [], extra = [];
    for (const ln of lines) {
      if (/^#EXT-X-(KEY|MAP)/.test(ln) && /URI="([^"]+)"/.test(ln)) {
        const u0 = ln.match(/URI="([^"]+)"/)[1];
        if (/^data:/i.test(u0)) { out.push(ln); continue; }
        const name = 'x' + extra.length + '.bin'; extra.push({ url: absU(u0, url), name });
        out.push(ln.replace(/URI="[^"]+"/, 'URI="' + name + '"'));
      } else if (ln && ln[0] !== '#') {
        const name = 's' + segs.length + '.ts'; segs.push({ url: absU(ln.trim(), url), name }); out.push(name);
      } else out.push(ln);
    }
    if (!segs.length) throw new Error('no segments');
    const all = extra.concat(segs); let done = 0, idx = 0;
    const worker = async () => {
      while (idx < all.length) {
        if (cancelled) throw new Error('cancel');
        const f = all[idx++];
        await downloadFile(fs, f.url, dir + '/' + f.name, src.headers);
        done++; bar('جارٍ تحميل ' + label + ' — ' + Math.round(done / all.length * 100) + '%', done / all.length * 100);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    await fs.writeFile({ path: dir + '/index.m3u8', directory: 'DATA', data: out.join('\n'), encoding: 'utf8', recursive: true });
    let size = 0; try { const r = await fs.readdir({ path: dir, directory: 'DATA' }); (r.files || []).forEach((f) => { size += f.size || 0; }); } catch (e) {}
    return { kind: 'hls', path: dir + '/index.m3u8', dir, size };
  }

  async function dlFile(fs, src, id, label) {
    const path = 'downloads/' + id + '.mp4';
    const h = await fs.addListener('progress', (p) => {
      if (p && p.contentLength > 0) bar('جارٍ تحميل ' + label + ' — ' + Math.round(p.bytes / p.contentLength * 100) + '%', p.bytes / p.contentLength * 100);
      else if (p && p.bytes) bar('جارٍ تحميل ' + label + ' — ' + fmt(p.bytes), 50);
    });
    try {
      await fs.downloadFile({ url: src.url, path, directory: 'DATA', recursive: true, progress: true, headers: { 'User-Agent': UA, ...(src.headers || {}) } });
      const st = await fs.stat({ path, directory: 'DATA' }).catch(() => ({ size: 0 }));
      return { kind: 'file', path, size: st.size || 0 };
    } catch (e) { try { await fs.deleteFile({ path, directory: 'DATA' }); } catch (e2) {} throw e; }
    finally { try { h.remove(); } catch (e) {} }
  }

  async function run(btns) {
    const fs = FS();
    if (!fs) return toast('التحميل كيحتاج نسخة جديدة من التطبيق (3awd build l-APK)');
    if (busy) return toast('كاين تحميل جاري، تسنّى يكمل');
    busy = true; cancelled = false;
    const title = (($('.hero h2') || {}).textContent || 'حلقة').trim();
    const ep = (($('.eps button.on') || {}).textContent || '').trim();
    const label = title + (ep ? ' · ' + ep : '');
    const id = Date.now().toString(36);
    try {
      bar('جارٍ البحث عن أحسن رابط تحميل…', 0);
      // نحل السيرفرات بالتوازي ونفضّل mp4 على HLS
      const cands = (await Promise.all(btns.filter((x) => x.u).slice(0, 12).map((b) => withTimeout(direct(b.u).catch(() => null), 14000)))).filter((x) => x && x.url);
      const ordered = cands.filter((c) => !c.hls).concat(cands.filter((c) => c.hls));
      if (!ordered.length) { toast('ما لقينا رابط قابل للتحميل. جرّب حلقة أخرى'); return; }
      let res = null, err = null;
      for (const src of ordered.slice(0, 4)) {
        if (cancelled) break;
        try { res = src.hls ? await dlHls(fs, src, id, label) : await dlFile(fs, src, id, label); break; }
        catch (e) { err = e; try { await fs.rmdir({ path: 'downloads/' + id, directory: 'DATA', recursive: true }); } catch (e2) {} }
      }
      if (cancelled) { toast('تلغى التحميل'); return; }
      if (!res) { toast('فشل التحميل — جرّب مرة أخرى'); return; }
      const a = list(); a.unshift({ id, title, ep, ...res, date: Date.now() }); save(a);
      toast('تحمّلات الحلقة ✔ — كتلقاها فـ «الحلقات المحملة»');
    } finally { bar(null); busy = false; cancelled = false; }
  }

  async function playItem(it) {
    try {
      const { uri } = await FS().getUri({ path: it.path, directory: 'DATA' });
      play({ url: cap().convertFileSrc(uri), title: it.title + (it.ep ? ' · ' + it.ep : '') });
    } catch (e) { toast('الملف ما بقاش كاين'); }
  }

  async function remove(it) {
    try { if (it.kind === 'hls') await FS().rmdir({ path: it.dir, directory: 'DATA', recursive: true }); else await FS().deleteFile({ path: it.path, directory: 'DATA' }); } catch (e) {}
    save(list().filter((x) => x.id !== it.id));
  }

  function render() {
    const a = list();
    view.innerHTML = '<div id="dlPage"><h2 class="cth">الحلقات المحملة</h2>' +
      (a.length ? a.map((it) => '<div class="dli" data-id="' + it.id + '"><button class="pl" data-a="p" title="تشغيل"><svg viewBox="0 0 24 24" style="fill:#fff;stroke:none"><path d="M8 5v14l11-7z"/></svg></button>' +
        '<div class="tx" data-a="p"><b>' + esc(it.title) + '</b><small>' + esc(it.ep || '') + (it.size ? ' · ' + fmt(it.size) : '') + '</small></div>' +
        '<button data-a="d" title="حذف"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>').join('')
        : '<div class="dle">ما كاين حتى حلقة محملة.<br>ف صفحة الحلقة، تحت السيرفرات، كلّيكي على «تحميل الحلقة» وتشوفها هنا بلا نت.</div>') + '</div>';
    view.querySelectorAll('.dli').forEach((row) => row.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-a]'); if (!t) return;
      const it = list().find((x) => x.id === row.dataset.id); if (!it) return;
      if (t.dataset.a === 'p') return playItem(it);
      if (!confirm('نحيّو هاد الحلقة من الجهاز؟')) return;
      await remove(it); render();
    }));
  }

  window.openDownloads = function () {
    if (typeof view === 'undefined') return;
    setNav(null);
    document.body.classList.remove('dr-open', 'cb-open');
    view.scrollTop = 0; render();
  };
  window.waDlEntry = (btns) => ({ t: '@@dl@@ تحميل الحلقة (مشاهدة بلا نت)', f: () => run(btns), dl: true });
  window.waDlIcon = ICON_DL;
})();
