/* ==============================================================
   墨线 Inkline · share.js
   文章分享：复制 Markdown / 复制链接 / 微博 / X / 微信扫码（二维码懒加载）
   ============================================================== */
(function () {
  'use strict';
  const root = document.getElementById('share');
  if (!root) return;

  const cfg = (window.INKLINE && window.INKLINE.share) || {};
  const title = root.dataset.title || document.title;
  const url = root.dataset.url || location.href;
  let urlPretty = url;
  try { urlPretty = decodeURI(url); } catch (_) {}

  const btn = root.querySelector('.share-btn');
  const menu = root.querySelector('.share-menu');
  const qrPanel = root.querySelector('.share-qr');

  const setOpen = (open) => {
    root.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', () => setOpen(!root.classList.contains('open')));
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('open')) setOpen(false);
  });

  /* ---------- 复制 + 原地反馈 ---------- */
  const copy = async (text, item) => {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); ok = true; } catch (_) {}
    }
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
    const label = item.querySelector('.share-item-label');
    if (label) {
      const orig = label.dataset.text || (label.dataset.text = label.textContent);
      label.textContent = ok ? (cfg.copied || '✓ Copied') : (cfg.copyFailed || 'Copy failed');
      setTimeout(() => { label.textContent = orig; }, 1200);
    }
  };

  /* ---------- 微信二维码：首次点开才加载 qrcode-generator ---------- */
  let qrLib = null;
  const loadQr = () => {
    if (window.qrcode) return Promise.resolve();
    if (!qrLib) {
      qrLib = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = cfg.qr;
        s.onload = resolve;
        s.onerror = () => { qrLib = null; reject(new Error('qr lib load failed')); };
        document.head.appendChild(s);
      });
    }
    return qrLib;
  };

  const showQr = () => {
    const img = qrPanel.querySelector('.share-qr-img');
    loadQr().then(() => {
      const qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      img.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    }).catch(() => {
      img.textContent = cfg.qrFailed || 'QR failed';
    });
  };

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-share]');
    if (!item) return;
    const act = item.dataset.share;
    if (act === 'md') {
      copy(`[${title}](${urlPretty})`, item);
    } else if (act === 'link') {
      copy(urlPretty, item);
    } else if (act === 'weibo') {
      window.open(
        `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
        '_blank', 'noopener,width=680,height=560'
      );
      setOpen(false);
    } else if (act === 'x') {
      window.open(
        `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        '_blank', 'noopener,width=680,height=560'
      );
      setOpen(false);
    } else if (act === 'wechat') {
      const showing = qrPanel.hidden;
      qrPanel.toggleAttribute('hidden');
      if (showing) showQr();
    }
  });
})();
