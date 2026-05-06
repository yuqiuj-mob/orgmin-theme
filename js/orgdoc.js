/* =============================================================================
   Bootstrap Org-HTML Documentation Theme
   orgdoc.js
   ============================================================================= */

const PALETTES = [
  { id: 'ocean',  name: 'Ocean',  swatch: '#0a7bc3' },
  { id: 'forest', name: 'Forest', swatch: '#109974' },
  { id: 'sunset', name: 'Sunset', swatch: '#ea580c' },
  { id: 'plum',   name: 'Plum',   swatch: '#7c3aed' },
  { id: 'rose',   name: 'Rose',   swatch: '#db2777' },
  { id: 'slate',  name: 'Slate',  swatch: '#475569' },
];
const DEFAULT_PALETTE = 'ocean';

/* Apply stored palette as early as possible to avoid flash on load. */
(function applyEarlyPalette() {
  try {
    const stored = localStorage.getItem('orgdoc-palette');
    if (stored && PALETTES.some(p => p.id === stored)) {
      document.documentElement.setAttribute('data-palette', stored);
    } else {
      document.documentElement.setAttribute('data-palette', DEFAULT_PALETTE);
    }
  } catch (_) { /* ignore */ }
})();

document.addEventListener('DOMContentLoaded', () => {
  const contentEl = document.getElementById('content');
  const postambleEl = document.getElementById('postamble');
  if (!contentEl) return;

  // ── 1. Extract pieces from org's default structure ───────────────────────
  const titleEl = contentEl.querySelector('h1.title');
  const tocEl   = document.getElementById('table-of-contents');
  const tocInner = tocEl ? tocEl.querySelector('#text-table-of-contents') : null;
  const docTitle = titleEl ? titleEl.textContent.trim() : document.title;

  // ── 2. Build Navbar ───────────────────────────────────────────────────────
  const navbar = document.createElement('nav');
  navbar.id = 'org-navbar';
  navbar.innerHTML = `
    <button id="sidebar-toggle" class="sidebar-toggle" aria-label="Toggle navigation">
      <i class="bi bi-list"></i>
    </button>
    <a class="org-brand" href="#" title="${escapeHtml(docTitle)}">${escapeHtml(docTitle)}</a>
    <div class="org-search-wrapper">
      <i class="bi bi-search search-icon"></i>
      <input type="search" id="org-search" placeholder="Search… (orderless · ?* glob · /regex/)"
             autocomplete="off" spellcheck="false">
      <kbd class="search-kbd">Ctrl K</kbd>
      <span class="search-mode" aria-hidden="true"></span>
      <div id="org-search-results" hidden></div>
    </div>
    <div class="palette-wrapper">
      <button id="palette-toggle" class="palette-toggle" aria-label="Change accent palette" aria-haspopup="true" aria-expanded="false">
        <i class="bi bi-palette"></i>
      </button>
      <div id="palette-popover" hidden role="menu">
        <div class="palette-popover-title">Accent palette</div>
        ${PALETTES.map(p => `
          <button class="palette-option" role="menuitemradio" data-palette="${p.id}">
            <span class="palette-swatch" style="--swatch: ${p.swatch}"></span>
            <span class="palette-name">${p.name}</span>
            <i class="bi bi-check2 palette-check"></i>
          </button>
        `).join('')}
      </div>
    </div>
    <button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
      <i class="bi bi-moon"></i>
    </button>
  `;

  // ── 3. Build Sidebar ──────────────────────────────────────────────────────
  const sidebar = document.createElement('aside');
  sidebar.id = 'org-sidebar';

  if (tocInner) {
    const tocDiv = document.createElement('div');
    tocDiv.id = 'org-toc';
    const label = document.createElement('div');
    label.className = 'toc-label';
    label.textContent = 'Contents';
    tocDiv.appendChild(label);
    tocDiv.appendChild(tocInner.cloneNode(true));
    sidebar.appendChild(tocDiv);
  }

  // ── 4. Build Main ─────────────────────────────────────────────────────────
  const main = document.createElement('main');
  main.id = 'org-main';

  const inner = document.createElement('div');
  inner.className = 'org-content-inner';

  const kids = Array.from(contentEl.children);
  kids.forEach(child => {
    if (child !== titleEl && child.id !== 'table-of-contents') {
      inner.appendChild(child);
    }
  });

  if (postambleEl) inner.appendChild(postambleEl);

  main.appendChild(inner);

  // ── 5. Overlay (mobile) ───────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';

  // ── 6. Wrapper ────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.id = 'org-wrapper';
  wrapper.appendChild(sidebar);
  wrapper.appendChild(main);

  // ── 7. Back to top ────────────────────────────────────────────────────────
  const bttBtn = document.createElement('button');
  bttBtn.id = 'back-to-top';
  bttBtn.title = 'Back to top';
  bttBtn.setAttribute('hidden', '');
  bttBtn.innerHTML = '<i class="bi bi-arrow-up-short"></i>';

  // ── 8. Replace body ───────────────────────────────────────────────────────
  document.body.appendChild(navbar);
  document.body.appendChild(overlay);
  document.body.appendChild(wrapper);
  document.body.appendChild(bttBtn);
  contentEl.remove();
  tocEl && tocEl.remove();

  // ── 9. Wire up all features ───────────────────────────────────────────────
  setupDarkMode();
  setupPaletteToggle();
  setupSidebarToggle(sidebar, overlay);
  setupSearch(main);
  setupTocHighlight(main, sidebar);
  setupBackToTop(bttBtn);
  setupCodeCopy(main);
  setupMermaid(main);
  applyBootstrapClasses(main);
});

/* =============================================================================
   PALETTE TOGGLE
   ============================================================================= */
function setupPaletteToggle() {
  const btn      = document.getElementById('palette-toggle');
  const popover  = document.getElementById('palette-popover');
  if (!btn || !popover) return;

  const options = popover.querySelectorAll('.palette-option');

  function getCurrent() {
    return document.documentElement.getAttribute('data-palette') || DEFAULT_PALETTE;
  }

  function applyPalette(id) {
    if (!PALETTES.some(p => p.id === id)) return;
    document.documentElement.setAttribute('data-palette', id);
    try { localStorage.setItem('orgdoc-palette', id); } catch (_) { /* ignore */ }
    options.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.palette === id);
      opt.setAttribute('aria-checked', opt.dataset.palette === id ? 'true' : 'false');
    });
  }

  function open()  { popover.hidden = false; btn.classList.add('open');  btn.setAttribute('aria-expanded', 'true');  }
  function close() { popover.hidden = true;  btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }

  applyPalette(getCurrent());

  btn.addEventListener('click', e => {
    e.stopPropagation();
    popover.hidden ? open() : close();
  });

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      applyPalette(opt.dataset.palette);
      close();
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.palette-wrapper')) close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !popover.hidden) close();
  });
}

/* =============================================================================
   DARK MODE
   ============================================================================= */
function setupDarkMode() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const stored = localStorage.getItem('orgdoc-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored ? stored === 'dark' : prefersDark;

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const icon = toggle.querySelector('i');
    icon.className = dark ? 'bi bi-sun' : 'bi bi-moon';
    localStorage.setItem('orgdoc-theme', dark ? 'dark' : 'light');
  }

  applyTheme(isDark);

  toggle.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
  });
}

/* =============================================================================
   SIDEBAR TOGGLE
   ============================================================================= */
function setupSidebarToggle(sidebar, overlay) {
  const toggle = document.getElementById('sidebar-toggle');
  if (!toggle) return;

  const isMobile = () => window.innerWidth <= 768;

  function openSidebar()  { sidebar.classList.add('open');     overlay.classList.add('visible'); }
  function closeSidebar() { sidebar.classList.remove('open');  overlay.classList.remove('visible'); }
  function toggleDesktop() {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('orgdoc-sidebar', sidebar.classList.contains('collapsed') ? '0' : '1');
  }

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    } else {
      toggleDesktop();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  sidebar.addEventListener('click', e => {
    if (e.target.closest('a') && isMobile()) closeSidebar();
  });

  if (!isMobile() && localStorage.getItem('orgdoc-sidebar') === '0') {
    sidebar.classList.add('collapsed');
  }

  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });
}

/* =============================================================================
   SEARCH — orderless tokens, glob (* ?), and /regex/ syntax
   ============================================================================= */
function setupSearch(main) {
  const input     = document.getElementById('org-search');
  const results   = document.getElementById('org-search-results');
  const wrapper   = document.querySelector('.org-search-wrapper');
  const modeBadge = wrapper && wrapper.querySelector('.search-mode');
  if (!input || !results) return;

  const index = [];
  main.querySelectorAll('h2[id], h3[id], h4[id]').forEach(h => {
    const textEl = document.getElementById('text-' + h.id);
    let text;
    if (textEl) {
      text = textEl.textContent.trim();
    } else {
      const level = parseInt(h.tagName[1]);
      text = '';
      let sib = h.nextElementSibling;
      while (sib) {
        const m = sib.tagName.match(/^H([2-4])$/i);
        if (m && parseInt(m[1]) <= level) break;
        text += ' ' + sib.textContent;
        sib = sib.nextElementSibling;
      }
      text = text.trim();
    }
    index.push({
      id:    h.id,
      title: h.textContent.trim(),
      text,
      level: h.tagName.toUpperCase(),
    });
  });

  let current = -1;
  let activeHighlights = [];

  /* ── Query parsing ─────────────────────────────────────────────────────
     Three modes:
       /pattern/flags   — JS regex (case-insensitive by default).
       tok1 tok2 ...    — orderless: every token must match anywhere.
       py* ?ust         — within a token, * and ? are glob wildcards.
  */
  function buildSearcher(rawQuery) {
    const q = rawQuery.trim();
    if (!q) return { mode: 'empty', regexes: [], match: () => false, ok: true, label: '' };

    const reMatch = q.match(/^\/(.*)\/([gimsu]*)$/);
    if (reMatch) {
      try {
        const flags = reMatch[2].includes('i') ? reMatch[2] : reMatch[2] + 'i';
        const re = new RegExp(reMatch[1] || '', flags);
        return { mode: 'regex', regexes: [re], match: (txt) => re.test(txt), ok: true, label: 'RE' };
      } catch (err) {
        return {
          mode: 'regex', regexes: [], match: () => false, ok: false,
          label: 'RE!', error: String(err.message || err),
        };
      }
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const regexes = [];
    let hasGlob = false;
    for (const t of tokens) {
      if (/[*?]/.test(t)) {
        hasGlob = true;
        const pattern = t
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        try { regexes.push(new RegExp(pattern, 'i')); } catch (_) { /* skip */ }
      } else {
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regexes.push(new RegExp(escaped, 'i'));
      }
    }
    return {
      mode: hasGlob ? 'glob' : 'orderless',
      regexes,
      match: (txt) => regexes.length > 0 && regexes.every(re => re.test(txt)),
      ok: true,
      label: hasGlob ? '*?' : '',
    };
  }

  function setMode(searcher) {
    if (!modeBadge || !wrapper) return;
    input.classList.toggle('search-error', !searcher.ok);
    if (searcher.label) {
      modeBadge.textContent = searcher.label;
      modeBadge.classList.toggle('mode-error', !searcher.ok);
      wrapper.classList.add('has-mode');
    } else {
      wrapper.classList.remove('has-mode');
      modeBadge.classList.remove('mode-error');
    }
  }

  function clearDocHighlights() {
    activeHighlights.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
    activeHighlights = [];
  }

  function combinedRegex(regexes, flags = 'gi') {
    if (!regexes.length) return null;
    try {
      const src = regexes.map(r => `(?:${r.source})`).join('|');
      return new RegExp(src, flags);
    } catch (_) { return null; }
  }

  function highlightSection(headingId, regexes) {
    clearDocHighlights();
    const heading = document.getElementById(headingId);
    if (!heading) return;
    const container = heading.parentElement;
    const re = combinedRegex(regexes);
    if (!re) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const toProcess = [];
    let node;
    while ((node = walker.nextNode()) !== null) {
      const tag = node.parentElement && node.parentElement.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') continue;
      re.lastIndex = 0;
      if (re.test(node.nodeValue)) toProcess.push(node);
    }

    toProcess.forEach(textNode => {
      re.lastIndex = 0;
      const parent = textNode.parentNode;
      const frag = document.createDocumentFragment();
      let lastIdx = 0, m;
      while ((m = re.exec(textNode.nodeValue)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(document.createTextNode(textNode.nodeValue.slice(lastIdx, m.index)));
        }
        const mark = document.createElement('mark');
        mark.className = 'doc-highlight';
        mark.textContent = m[0];
        frag.appendChild(mark);
        activeHighlights.push(mark);
        lastIdx = m.index + m[0].length;
        if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width
      }
      if (lastIdx < textNode.nodeValue.length) {
        frag.appendChild(document.createTextNode(textNode.nodeValue.slice(lastIdx)));
      }
      parent.replaceChild(frag, textNode);
    });
  }

  function extractSnippet(text, regexes, maxLen = 160) {
    if (!text) return '';
    let earliest = -1, hitLen = 0;
    for (const re of regexes) {
      const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      const m = r.exec(text);
      if (m && (earliest === -1 || m.index < earliest)) {
        earliest = m.index;
        hitLen = m[0].length;
      }
    }
    if (earliest === -1) return text.substring(0, maxLen);
    const start = Math.max(0, earliest - 55);
    const end   = Math.min(text.length, earliest + hitLen + 100);
    let snippet = text.substring(start, end).replace(/\s+/g, ' ');
    if (start > 0) snippet = '…' + snippet;
    if (end < text.length) snippet += '…';
    return snippet.substring(0, maxLen + 4);
  }

  function highlightHTML(html, regexes) {
    const re = combinedRegex(regexes);
    if (!re) return html;
    return html.replace(re, m => `<mark>${m}</mark>`);
  }

  function syntaxHintHTML() {
    return `
      <div class="search-syntax-hint">
        <span class="syntax-tag">Syntax</span>
        <span><kbd>foo bar</kbd> orderless</span>
        <span><kbd>py*</kbd> glob</span>
        <span><kbd>/^def/</kbd> regex</span>
      </div>
    `;
  }

  function doSearch() {
    const raw = input.value;
    const searcher = buildSearcher(raw);
    setMode(searcher);

    if (searcher.mode === 'empty') { hide(); return; }

    if (!searcher.ok) {
      results.innerHTML = `
        <div class="search-no-results">
          <i class="bi bi-exclamation-circle"></i>
          Invalid regex: ${escapeHtml(searcher.error || '')}
        </div>
        ${syntaxHintHTML()}
      `;
      results.hidden = false;
      current = -1;
      return;
    }

    const hits = index.filter(item =>
      searcher.match(item.title + '\n' + item.text)
    ).slice(0, 12);

    if (hits.length === 0) {
      results.innerHTML = `
        <div class="search-no-results">
          <i class="bi bi-search"></i>
          No results for &ldquo;${escapeHtml(raw.trim())}&rdquo;
        </div>
        ${syntaxHintHTML()}
      `;
    } else {
      const levelClass = lvl => `level-${lvl.toLowerCase()}`;
      results.innerHTML = hits.map((item, i) => {
        const preview = extractSnippet(item.text, searcher.regexes);
        return `
          <a href="#${item.id}" class="search-result-item" data-idx="${i}">
            <span class="search-result-level ${levelClass(item.level)}">${item.level}</span>
            <span class="search-result-title">${highlightHTML(escapeHtml(item.title), searcher.regexes)}</span>
            ${preview ? `<span class="search-result-preview">${highlightHTML(escapeHtml(preview), searcher.regexes)}</span>` : ''}
          </a>
        `;
      }).join('');

      results.innerHTML += `
        <div class="search-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
        ${syntaxHintHTML()}
      `;
    }
    results.hidden = false;
    current = -1;
  }

  function hide() {
    results.hidden = true;
    results.innerHTML = '';
    current = -1;
    clearDocHighlights();
  }

  input.addEventListener('input', doSearch);

  input.addEventListener('keydown', e => {
    const items = results.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown')  { e.preventDefault(); moveTo(items, current + 1); }
    if (e.key === 'ArrowUp')    { e.preventDefault(); moveTo(items, current - 1); }
    if (e.key === 'Enter' && current >= 0) { items[current]?.click(); }
    if (e.key === 'Escape')     { input.value = ''; setMode(buildSearcher('')); hide(); input.blur(); }
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  function moveTo(items, idx) {
    if (!items.length) return;
    if (current >= 0) items[current].classList.remove('active');
    current = Math.max(0, Math.min(idx, items.length - 1));
    items[current].classList.add('active');
    items[current].scrollIntoView({ block: 'nearest' });
  }

  results.addEventListener('click', e => {
    const item = e.target.closest('.search-result-item');
    if (item) {
      const searcher = buildSearcher(input.value);
      const href = item.getAttribute('href');
      const id = href ? href.slice(1) : null;
      input.value = '';
      setMode(buildSearcher(''));
      hide();
      if (id && searcher.regexes.length) {
        setTimeout(() => highlightSection(id, searcher.regexes), 80);
      }
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.org-search-wrapper')) hide();
  });
}

/* =============================================================================
   TOC ACTIVE HIGHLIGHTING
   ============================================================================= */
function setupTocHighlight(main, sidebar) {
  const tocEl = document.getElementById('org-toc');
  if (!tocEl) return;

  const headings  = Array.from(main.querySelectorAll('h2[id], h3[id], h4[id]'));
  const tocLinks  = Array.from(tocEl.querySelectorAll('a[href^="#"]'));
  if (!headings.length || !tocLinks.length) return;

  const tocByHref = {};
  tocLinks.forEach(a => { tocByHref[a.getAttribute('href')] = a; });

  function setActive(id) {
    tocLinks.forEach(a => a.classList.remove('active'));
    const link = tocByHref['#' + id];
    if (!link) return;
    link.classList.add('active');
    const sTop = sidebar.scrollTop;
    const sH   = sidebar.clientHeight;
    const lTop = link.offsetTop;
    const lH   = link.clientHeight;
    if (lTop < sTop + 24 || lTop + lH > sTop + sH - 24) {
      sidebar.scrollTo({ top: lTop - sH / 3, behavior: 'smooth' });
    }
  }

  const io = new IntersectionObserver(entries => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, {
    rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 52}px 0px -60% 0px`,
    threshold: 0,
  });

  headings.forEach(h => io.observe(h));
}

/* =============================================================================
   BACK TO TOP
   ============================================================================= */
function setupBackToTop(btn) {
  window.addEventListener('scroll', () => {
    btn.hidden = window.scrollY < 400;
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* =============================================================================
   CODE COPY BUTTONS
   ============================================================================= */
function setupCodeCopy(main) {
  main.querySelectorAll('pre.src:not(.src-mermaid), pre.example').forEach(pre => {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    pre.classList.add('in-wrapper');

    const langClass = Array.from(pre.classList).find(c => c.startsWith('src-'));
    const lang = langClass ? langClass.replace('src-', '') : (pre.classList.contains('example') ? 'text' : '');
    const langNorm = lang.toLowerCase().replace(/\s+/g, '-');

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span class="code-lang lang-${escapeHtml(langNorm)}">${escapeHtml(lang)}</span>
      <button class="copy-btn" title="Copy to clipboard">
        <i class="bi bi-clipboard"></i>
        <span class="copy-label">Copy</span>
      </button>
    `;
    wrapper.insertBefore(header, pre);

    header.querySelector('.copy-btn').addEventListener('click', function () {
      const text = pre.innerText;
      const btn = this;
      navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '<i class="bi bi-check2"></i><span class="copy-label">Copied!</span>';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<i class="bi bi-clipboard"></i><span class="copy-label">Copy</span>';
          btn.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(pre);
        sel.removeAllRanges();
        sel.addRange(range);
      });
    });
  });
}

/* =============================================================================
   MERMAID DIAGRAMS
   ============================================================================= */
function setupMermaid(main) {
  const blocks = main.querySelectorAll('pre.src-mermaid');
  if (!blocks.length || typeof mermaid === 'undefined') return;

  /* Mermaid diagrams pick up the current accent palette via CSS variables. */
  function readAccent() {
    const cs = getComputedStyle(document.documentElement);
    const rgb = cs.getPropertyValue('--accent-rgb').trim() || '10, 123, 195';
    const hover = cs.getPropertyValue('--accent-hover').trim() || '#3a96d4';
    return { rgb, hover, hex: `rgb(${rgb})` };
  }

  function buildVars(isDark) {
    const a = readAccent();
    if (isDark) {
      return {
        primaryColor: '#1a2d3e',
        primaryBorderColor: a.hex,
        primaryTextColor: '#e2e8f0',
        lineColor: '#94a3b8',
        secondaryColor: '#1e293b',
        tertiaryColor: '#2d3748',
        background: '#1a1d27',
        mainBkg: '#1a2d3e',
        nodeBorder: a.hex,
        clusterBkg: '#1e2533',
        clusterBorder: '#2d3748',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1a1d27',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: '14px',
      };
    }
    return {
      primaryColor: `rgba(${a.rgb}, 0.12)`,
      primaryBorderColor: a.hex,
      primaryTextColor: '#1e293b',
      lineColor: '#64748b',
      secondaryColor: '#f0f4f8',
      tertiaryColor: '#f8fbfe',
      background: '#ffffff',
      mainBkg: `rgba(${a.rgb}, 0.10)`,
      nodeBorder: a.hex,
      clusterBkg: '#f0f8ff',
      clusterBorder: '#cbd5e1',
      titleColor: '#1e293b',
      edgeLabelBackground: '#ffffff',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontSize: '14px',
    };
  }

  // Replace pre blocks with wrapper divs, storing original code
  blocks.forEach(pre => {
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-wrapper';
    wrapper.dataset.code = pre.innerText.trim();
    pre.parentNode.replaceChild(wrapper, pre);
  });

  async function renderAll() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: buildVars(isDark),
      flowchart: { curve: 'basis', padding: 16, useMaxWidth: true },
      sequence: { useMaxWidth: true, actorMargin: 60 },
      er: { useMaxWidth: true },
    });

    const wrappers = main.querySelectorAll('.mermaid-wrapper[data-code]');
    for (const wrapper of wrappers) {
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      try {
        const { svg } = await mermaid.render(id, wrapper.dataset.code);
        wrapper.innerHTML = svg;
      } catch (err) {
        wrapper.outerHTML = `<div class="mermaid-error">Mermaid error: ${escapeHtml(String(err))}</div>`;
      }
    }
  }

  renderAll();

  // Re-render when dark mode or palette changes
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => setTimeout(renderAll, 50));
  }
  const paletteToggle = document.getElementById('palette-popover');
  if (paletteToggle) {
    paletteToggle.addEventListener('click', e => {
      if (e.target.closest('.palette-option')) setTimeout(renderAll, 50);
    });
  }
}

/* =============================================================================
   APPLY BOOTSTRAP CLASSES TO ORG ELEMENTS
   ============================================================================= */
function applyBootstrapClasses(main) {
  main.querySelectorAll('table').forEach(table => {
    if (table.closest('.table-responsive')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-responsive';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  main.querySelectorAll('span.tag').forEach(span => {
    span.classList.add('tag');
  });
}

/* =============================================================================
   UTILITIES
   ============================================================================= */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(html, query) {
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
}
