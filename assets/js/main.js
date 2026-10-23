/* ==============================================================
   墨线 Inkline · main.js
   主题切换 / 全局字号 / 搜索弹窗 / TOC scrollspy / 回顶 / 日历
   ============================================================== */
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

  /* ---------- 搜索弹窗（/ 或 ⌘K，全站可用） ---------- */
  const esc = (s) => {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : s;
    return d.innerHTML;
  };

  let searchIndex = null;          // index.json 数据
  let indexLoading = null;         // 进行中的请求（去重）
  let modal = null;                // 弹窗根元素
  let inputEl = null, listEl = null;
  let results = [], activeIdx = -1;

  const loadIndex = () => {
    if (searchIndex) return Promise.resolve(searchIndex);
    if (!indexLoading) {
      indexLoading = fetch(window.INKLINE.searchIndex)
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then((j) => (searchIndex = j));
    }
    return indexLoading;
  };

  const ensureModal = () => {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'search-modal';
    modal.innerHTML =
      '<div class="search-panel" role="dialog" aria-modal="true">' +
      '  <div class="search-head"><span class="prompt">&gt;_</span>' +
      '  <input id="search-input" type="search" autocomplete="off" placeholder="' + esc((window.INKLINE && window.INKLINE.searchPlaceholder) || '搜索文章…') + '">' +
      '  <kbd>esc</kbd></div>' +
      '  <div class="search-results" id="search-results"></div>' +
      '  <div class="search-foot">↑↓ 选择 · Enter 打开 · Esc 关闭</div>' +
      '</div>';
    document.body.appendChild(modal);
    inputEl = modal.querySelector('input');
    listEl = modal.querySelector('.search-results');

    inputEl.addEventListener('input', () => render(inputEl.value.trim().toLowerCase()));
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modal.querySelector('.search-panel').addEventListener('click', (e) => e.stopPropagation());
  };

  const openSearch = () => {
    ensureModal();
    modal.classList.add('open');
    inputEl.value = '';
    activeIdx = -1;
    listEl.innerHTML = '<div class="empty">' + esc((window.INKLINE && window.INKLINE.searchHint) || '') + '</div>';
    setTimeout(() => inputEl.focus(), 50);
    loadIndex().catch(() => { listEl.innerHTML = '<div class="empty">搜索索引加载失败</div>'; });
  };

  const closeModal = () => { if (modal) modal.classList.remove('open'); inputEl && inputEl.blur(); };

  const setActive = (i) => {
    activeIdx = i;
    listEl.querySelectorAll('a').forEach((a, k) => a.classList.toggle('active', k === i));
  };

  const render = (v) => {
    if (!v) {
      listEl.innerHTML = '<div class="empty">' + esc((window.INKLINE && window.INKLINE.searchHint) || '') + '</div>';
      results = []; activeIdx = -1; return;
    }
    loadIndex().then((items) => {
      results = items.filter((it) =>
        (it.title + ' ' + (it.summary || '') + ' ' + (it.categories || []).join(' ') + ' ' + (it.tags || []).join(' '))
          .toLowerCase().includes(v)
      ).slice(0, 8);
      listEl.innerHTML = results.length
        ? results.map((h, i) =>
            `<a href="${esc(h.href)}" class="${i === 0 ? 'active' : ''}"><div class="sr-title">${esc(h.title)}</div>` +
            `<div class="sr-meta">${esc(h.date)}${(h.categories && h.categories.length) ? ' · ' + esc(h.categories.join(' / ')) : ''}</div></a>`
          ).join('')
        : '<div class="empty">没有匹配的文章</div>';
      activeIdx = results.length ? 0 : -1;
    });
  };

  const btnSearch = document.getElementById('btn-search');
  if (btnSearch) btnSearch.addEventListener('click', openSearch);

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault(); openSearch(); return;
    }
    if (!modal || !modal.classList.contains('open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((activeIdx + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((activeIdx - 1 + results.length) % results.length); }
    else if (e.key === 'Enter' && activeIdx >= 0) { location.href = results[activeIdx].href; }
  });

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

  /* ---------- GitHub 贡献日历（jogruber API → 主题色阶热力图） ---------- */
  document.querySelectorAll('.gh-calendar .calendar[data-user]').forEach((cal) => {
    const user = cal.dataset.user;
    const cfg = (window.INKLINE && window.INKLINE.ghCal) || {};
    fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(() => new Promise((r) => setTimeout(r, 1500))
        .then(() => fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`))
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(() => null))
      .then((data) => {
        if (!data) { cal.textContent = 'GitHub calendar unavailable'; return; }
        const days = data.contributions || [];
        if (!days.length) { cal.textContent = '—'; return; }
        const total = (data.total && data.total.lastYear) ||
          days.reduce((a, d) => a + d.count, 0);

        const cols = [];
        let col = new Array(new Date(days[0].date + 'T00:00:00').getDay()).fill(null);
        days.forEach((d) => {
          col.push(d);
          if (col.length === 7) { cols.push(col); col = []; }
        });
        if (col.length) cols.push(col);

        const lang = document.documentElement.lang || 'zh-CN';
        const monthLabel = (iso) => new Date(iso + 'T00:00:00')
          .toLocaleString(lang, { month: 'short' });

        cal.innerHTML = '';

        const summary = document.createElement('div');
        summary.className = 'gh-cal-summary';
        summary.textContent = (cfg.summary || '%d').replace('%d', Number(total).toLocaleString());
        cal.appendChild(summary);

        let lastM = -1;
        const mrow = document.createElement('div');
        mrow.className = 'gh-cal-months';
        mrow.style.gridTemplateColumns = `repeat(${cols.length}, 10px)`;
        cols.forEach((c) => {
          const span = document.createElement('span');
          const d0 = c.find(Boolean);
          if (d0) {
            const m = new Date(d0.date + 'T00:00:00').getMonth();
            if (m !== lastM) { span.textContent = monthLabel(d0.date); lastM = m; }
          }
          mrow.appendChild(span);
        });
        cal.appendChild(mrow);

        const scroll = document.createElement('div');
        scroll.className = 'gh-cal-scroll';
        const grid = document.createElement('div');
        grid.className = 'gh-cal-grid';
        grid.style.gridTemplateColumns = `repeat(${cols.length}, 10px)`;
        cols.forEach((c) => {
          const colEl = document.createElement('div');
          colEl.className = 'gh-cal-col';
          c.forEach((d) => {
            const cell = document.createElement('div');
            cell.className = 'gh-cal-cell' + (d ? ' l' + d.level : '');
            if (d && d.count) cell.title = `${d.date} · ${d.count}`;
            colEl.appendChild(cell);
          });
          grid.appendChild(colEl);
        });
        scroll.appendChild(grid);
        cal.appendChild(scroll);

        const legend = document.createElement('div');
        legend.className = 'gh-cal-legend';
        legend.innerHTML = 'Less ' + [0, 1, 2, 3, 4].map((l) =>
          `<div class="gh-cal-cell l${l}"></div>`).join('') + ' More';
        cal.appendChild(legend);
      });
  });
})();
