/* تحميل الحلقات + الحلقات المحملة (مشاهدة بلا نت) — Android فقط (Capacitor Filesystem) */
(function () {
  const LS = 'wa_dl_v1';
  const cap = () => window.Capacitor;
  const FS = () => cap() && cap().Plugins && cap().Plugins.Filesystem;
  const list = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch (e) { return []; } };
  const save = (a) => { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (e) {} };
  const fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(0) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
  const ICON_DL = '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>';
  let busy = false;

  const css = document.createElement('style');
  css.textContent =
    '#dlBar{position:fixed;z-index:9500;inset-inline:12px;bottom:calc(86px + env(safe-area-inset-bottom,0px));background:#120e2bf2;border:1px solid #7b4dff55;border-radius:16px;padding:10px 14px;color:#fff;font-size:13px;font-weight:700;direction:rtl;box-shadow:0 10px 30px #000a}' +
    '#dlBar i{display:block;height:5px;border-radius:3px;background:#ffffff22;margin-top:8px;overflow:hidden}#dlBar i b{display:block;height:100%;width:0;background:#7b4dff;transition:width .3s}' +
    '#dlPage{padding:6px var(--gut,14px) 0;direction:rtl}#dlPage .cth{margin:4px 0 14px;font-size:22px;font-weight:900}' +
    '#dlPage .dli{display:flex;align-items:center;gap:10px;background:var(--panel,#16122e);border:1px solid var(--line,#ffffff1a);border-radius:16px;padding:10px 12px;margin-bottom:10px}' +
    '#dlPage .dli .tx{flex:1;min-width:0;cursor:pointer}#dlPage .dli b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#dlPage .dli small{color:var(--mute,#9a98b5);font-size:12px}' +
    '#dlPage .dli button{background:none;border:0;color:#fff;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center}' +
    '#dlPage .dli button.pl{background:#7b4dff;border-radius:50%}#dlPage .dli button svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '#dlPage .dle{text-align:center;color:var(--mute,#9a98b5);padding:60px 10px;font-size:14px;line-height:1.9}';
  document.head.appendChild(css);

  async function direct(u) {
    if (/mediafire\./i.test(hostOf(u))) return window.api && window.api.ar && window.api.ar.direct ? await window.api.ar.direct(u).catch(() => null) : null;
    if (/\.m3u8|master\.txt/i.test(u)) return null;
    if (/\.(mp4|webm|mkv)(\?|$)/i.test(u)) return u;
    const rh = await window.api.resolveHost(u).catch(() => null);
    return rh && rh.url && !/\.m3u8|master\.txt/i.test(rh.url) ? rh.url : null;
  }

  function bar(txt, p) {
    let b = document.getElementById('dlBar');
    if (txt === null) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'dlBar'; b.innerHTML = '<span></span><i><b></b></i>'; document.body.appendChild(b); }
    b.querySelector('span').textContent = txt;
    b.querySelector('b').style.width = (p || 0) + '%';
  }

  async function run(btns) {
    const fs = FS();
    if (!fs) return toast('التحميل كيحتاج نسخة جديدة من التطبيق (3awd build l-APK)');
    if (busy) return toast('كاين تحميل جاري، تسنّى يكمل');
    busy = true;
    const title = (($('.hero h2') || {}).textContent || 'حلقة').trim();
    const ep = (($('.eps button.on') || {}).textContent || '').trim();
    try {
      toast('جارٍ البحث عن رابط تحميل مباشر…');
      let url = null;
      for (const b of btns.filter((x) => x.u).slice(0, 15)) {
        try { url = await withTimeout(direct(b.u), 12000); } catch (e) {}
        if (url) break;
      }
      if (!url) { toast('ما لقينا رابط مباشر (mp4). جرّب حلقة وحدة أخرى أو سيرفر Mediafire/Uqload'); return; }
      const id = Date.now().toString(36), path = 'downloads/' + id + '.mp4';
      const label = title + (ep ? ' · ' + ep : '');
      bar('جارٍ تحميل ' + label + '…', 0);
      const h = await fs.addListener('progress', (p) => {
        if (p && p.contentLength > 0) bar('جارٍ تحميل ' + label + ' — ' + Math.round(p.bytes / p.contentLength * 100) + '%', p.bytes / p.contentLength * 100);
        else if (p && p.bytes) bar('جارٍ تحميل ' + label + ' — ' + fmt(p.bytes), 50);
      });
      try {
        await fs.downloadFile({ url, path, directory: 'DATA', recursive: true, progress: true });
        const st = await fs.stat({ path, directory: 'DATA' }).catch(() => ({ size: 0 }));
        const a = list(); a.unshift({ id, title, ep, path, size: st.size || 0, date: Date.now() }); save(a);
        toast('تحمّلات الحلقة ✔ — كتلقاها فـ «الحلقات المحملة»');
      } catch (e) {
        try { await fs.deleteFile({ path, directory: 'DATA' }); } catch (e2) {}
        toast('فشل التحميل — جرّب مرة أخرى');
      } finally { try { h.remove(); } catch (e) {} }
    } finally { bar(null); busy = false; }
  }

  async function playItem(it) {
    try {
      const { uri } = await FS().getUri({ path: it.path, directory: 'DATA' });
      play({ url: cap().convertFileSrc(uri), title: it.title + (it.ep ? ' · ' + it.ep : '') });
    } catch (e) { toast('الملف ما بقاش كاين'); }
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
      try { await FS().deleteFile({ path: it.path, directory: 'DATA' }); } catch (e2) {}
      save(list().filter((x) => x.id !== it.id)); render();
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
