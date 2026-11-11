(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motion = window.Motion;
  const animate = (target, keyframes, options) => {
    if (reduceMotion.matches || !motion) return;
    try { motion.animate(target, keyframes, options); } catch (_) { /* Content stays visible without animation. */ }
  };
  document.body.classList.add('js');

  // Only create optional icons when the locally bundled library is available.
  document.querySelectorAll('.pub__meta a').forEach(link => {
    const icon = document.createElement('i');
    icon.dataset.lucide = link.textContent.trim() === 'Code' ? 'code-2' : 'file-text';
    icon.setAttribute('aria-hidden', 'true');
    link.prepend(icon);
  });
  if (window.lucide) window.lucide.createIcons();

  // Native dialog provides focus containment and Escape-to-close behavior.
  // Without JavaScript or dialog support, the link opens the photo directly.
  const photoLink = document.querySelector('.portrait__open');
  const photoViewer = document.querySelector('#photo-lightbox');
  if (photoLink && photoViewer && typeof photoViewer.showModal === 'function') {
    photoLink.setAttribute('aria-haspopup', 'dialog');
    photoLink.setAttribute('aria-controls', photoViewer.id);
    photoLink.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (photoViewer.open) return;
      photoViewer.showModal();
      document.documentElement.classList.add('photo-open');
    });
    photoViewer.querySelector('.photo-lightbox__close').addEventListener('click', () => photoViewer.close());
    photoViewer.addEventListener('click', event => {
      if (event.target === photoViewer) photoViewer.close();
    });
    photoViewer.addEventListener('close', () => {
      document.documentElement.classList.remove('photo-open');
      photoLink.focus({ preventScroll: true });
    });
  }

  // Four recent updates are visible initially; every original update is retained.
  const newsItems = [...document.querySelectorAll('.news li')];
  const newsToggle = document.querySelector('.news-toggle');
  const archive = document.createElement('ul');
  archive.className = 'news';
  archive.id = 'news-archive';
  archive.hidden = true;
  newsItems.slice(4).forEach(item => archive.append(item));
  newsToggle.before(archive);
  newsToggle.querySelector('span').textContent = `View all ${newsItems.length} updates`;
  newsToggle.addEventListener('click', () => {
    const expanded = newsToggle.getAttribute('aria-expanded') !== 'true';
    newsToggle.setAttribute('aria-expanded', String(expanded));
    archive.hidden = !expanded;
    newsToggle.querySelector('span').textContent = expanded ? 'Show fewer updates' : `View all ${newsItems.length} updates`;
    const icon = newsToggle.querySelector('svg');
    if (icon) icon.style.transform = expanded ? 'rotate(180deg)' : '';
  });

  const pubs = [...document.querySelectorAll('.pub')];
  const years = [...document.querySelectorAll('.year')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const search = document.querySelector('#pub-search');
  const status = document.querySelector('#result-status');
  const empty = document.querySelector('#empty-state');
  let mode = 'selected';
  const selected = pubs.filter(pub => pub.hasAttribute('data-selected')).length;
  const searchable = new Map(pubs.map(pub => [pub, [...pub.querySelectorAll('.pub__title, .pub__desc, .pub__authors, .pub__venue')].map(el => el.textContent).join(' ').toLowerCase()]));
  filters.forEach(button => {
    button.querySelector('.filter-count').textContent = button.dataset.filter === 'selected' ? selected : pubs.length;
    button.addEventListener('click', () => { mode = button.dataset.filter; applyFilter(); });
  });
  function applyFilter() {
    const query = search.value.trim().toLowerCase();
    let count = 0;
    pubs.forEach(pub => {
      pub.hidden = (mode === 'selected' && !pub.hasAttribute('data-selected')) || !searchable.get(pub).includes(query);
      if (!pub.hidden) count++;
    });
    years.forEach(year => { year.hidden = ![...year.querySelectorAll('.pub')].some(pub => !pub.hidden); });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === mode)));
    empty.hidden = count !== 0;
    status.textContent = `${count} ${mode === 'selected' ? 'selected ' : ''}publication${count === 1 ? '' : 's'} shown${query ? ` matching “${search.value.trim()}”` : ''}.`;
  }
  search.addEventListener('input', applyFilter);
  document.querySelector('#reset-search').addEventListener('click', () => {
    mode = 'all';
    search.value = '';
    applyFilter();
    search.focus();
  });
  applyFilter();

  document.querySelectorAll('.bib-btn').forEach(button => {
    button.addEventListener('click', () => {
      const box = document.getElementById(button.getAttribute('aria-controls'));
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      box.hidden = !expanded;
    });
  });
  document.querySelectorAll('.copy').forEach(button => {
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      const pre = button.parentElement.querySelector('pre');
      let copied = false;
      try { await navigator.clipboard.writeText(pre.textContent); copied = true; } catch (_) {
        // A local file or an older browser may lack Clipboard API support.
        const area = document.createElement('textarea');
        area.value = pre.textContent;
        area.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(area);
        area.select();
        try { copied = document.execCommand('copy'); } catch (_) { /* Offer manual selection below. */ }
        area.remove();
        button.focus({ preventScroll: true });
      }
      if (!copied) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
      button.textContent = copied ? 'Copied!' : 'Selected — press Ctrl/Cmd+C';
      window.setTimeout(() => { button.textContent = 'Copy'; }, 2200);
    });
  });

  // Highlight the section nearest the sticky header, including when scrolling up.
  const navLinks = [...document.querySelectorAll('.nav a')];
  const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
  let scheduled = false;
  function syncNav() {
    let current = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= 145) current = index; });
    navLinks.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(syncNav); }
  }, { passive: true });
  window.addEventListener('resize', syncNav);
  syncNav();
  animate('.hero__text', { opacity: [0, 1], y: [12, 0] }, { duration: 0.65, ease: 'easeOut' });
  animate('.portrait', { opacity: [0, 1], y: [12, 0] }, { duration: 0.75, delay: 0.12, ease: 'easeOut' });
})();
