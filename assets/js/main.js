/* ==============================
   墨线 Inkline · main.js
   主题切换 / 全局字号 / 搜索 / TOC scrollspy / 回顶
   ============================== */
(function () {
  'use strict';
  const root = document.documentElement;

  /* ---------- 主题切换（记忆选择，默认跟随系统） ---------- */
  const saved = localStorage.getItem('inkline-theme');
  if (saved) root.dataset.theme = saved;
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.dataset.theme = 'dark';

  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) btnTheme.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('inkline-theme', next);
  });

  /* ---------- 字号三档：小 / 中 / 大（全局根字号，记忆选择） ---------- */
  const fsMenu = document.getElementById('fs-menu');
  const savedFs = localStorage.getItem('inkline-fontsize');
  if (savedFs) root.dataset.fontsize = savedFs;

  function syncFsUi() {
    if (!fsMenu) return;
    const cur = root.dataset.fontsize || 's';
    fsMenu.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.fs === cur));
  }

  if (fsMenu) {
    document.getElementById('btn-fontsize').addEventListener('click', (e) => {
      e.stopPropagation();
      fsMenu.classList.toggle('open');
      syncFsUi();
    });
    fsMenu.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      root.dataset.fontsize = b.dataset.fs;
      localStorage.setItem('inkline-fontsize', b.dataset.fs);
      syncFsUi();
      fsMenu.classList.remove('open');
    }));
    document.addEventListener('click', (e) => {
      if (!fsMenu.contains(e.target)) fsMenu.classList.remove('open');
    });
  }

  /* ---------- 回到顶部 ---------- */
  const btnTop = document.getElementById('btn-top');
  if (btnTop) {
    addEventListener('scroll', () => {
      btnTop.classList.toggle('show', scrollY > 600);
    }, { passive: true });
    btnTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ---------- 快捷键：/ 或 ⌘K 聚焦搜索 ---------- */
  const q = document.getElementById('q');
  if (q) {
    document.addEventListener('keydown', (e) => {
      if ((e.key === '/' && document.activeElement !== q) ||
          ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        q.focus();
      }
      if (e.key === 'Escape') q.blur();
    });
  }

  /* ---------- 客户端搜索（index.json） ---------- */
  const box = document.getElementById('search-results');
  if (q && box && window.INKLINE && window.INKLINE.searchIndex) {
    let data = null;
    const load = () => data ? Promise.resolve(data) :
      fetch(window.INKLINE.searchIndex).then(r => r.json()).then(j => (data = j));

    const esc = (s) => {
      const d = document.createElement('div');
      d.textContent = s == null ? '' : s;
      return d.innerHTML;
    };

    const render = (items) => {
      box.innerHTML = items.length
        ? items.map(h =>
            `<a href="${esc(h.href)}"><div class="sr-title">${esc(h.title)}</div>` +
            `<div class="sr-meta">${esc(h.date)}${(h.categories && h.categories.length) ? ' · ' + esc(h.categories.join(' / ')) : ''}</div></a>`
          ).join('')
        : '<div class="empty">没有匹配的文章</div>';
      box.hidden = false;
    };

    const onType = () => {
      const v = q.value.trim().toLowerCase();
      if (!v) { box.hidden = true; return; }
      load().then(items => {
        const hits = items.filter(it =>
          (it.title + ' ' + (it.summary || '') + ' ' + (it.categories || []).join(' ') + ' ' + (it.tags || []).join(' '))
            .toLowerCase().includes(v)
        ).slice(0, 8);
        render(hits);
      });
    };

    q.addEventListener('input', onType);
    q.addEventListener('focus', onType);
    q.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = box.querySelector('a');
        if (first) location.href = first.getAttribute('href');
      }
      if (e.key === 'Escape') box.hidden = true;
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.cmdzone')) box.hidden = true;
    });
  }

  /* ---------- TOC scrollspy ---------- */
  const tocLinks = [...document.querySelectorAll('#toc-nav a')];
  if (tocLinks.length) {
    const heads = tocLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const spy = () => {
      const y = scrollY + 120;
      let cur = 0;
      heads.forEach((h, i) => { if (h.offsetTop <= y) cur = i; });
      tocLinks.forEach((a, i) => a.classList.toggle('active', i === cur));
    };
    addEventListener('scroll', spy, { passive: true });
    spy();
  }
})();
