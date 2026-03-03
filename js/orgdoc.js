/* =============================================================================
   Bootstrap Org-HTML Documentation Theme
   orgdoc.js
   ============================================================================= */

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
      <input type="search" id="org-search" placeholder="Search…" autocomplete="off" spellcheck="false">
      <kbd class="search-kbd">Ctrl K</kbd>
      <div id="org-search-results" hidden></div>
    </div>
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
    // clone so we don't disturb original
    tocDiv.appendChild(tocInner.cloneNode(true));
    sidebar.appendChild(tocDiv);
  }

  // ── 4. Build Main ─────────────────────────────────────────────────────────
  const main = document.createElement('main');
  main.id = 'org-main';

  // Inner wrapper for max-width centering
  const inner = document.createElement('div');
  inner.className = 'org-content-inner';

  // Move all content children (except title and toc) into inner
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
  setupSidebarToggle(sidebar, overlay);
  setupSearch(main);
  setupTocHighlight(main, sidebar);
  setupBackToTop(bttBtn);
  setupCodeCopy(main);
  applyBootstrapClasses(main);
});

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

  // Close mobile sidebar on nav link click
  sidebar.addEventListener('click', e => {
    if (e.target.closest('a') && isMobile()) closeSidebar();
  });

  // Restore desktop collapsed state
  if (!isMobile() && localStorage.getItem('orgdoc-sidebar') === '0') {
    sidebar.classList.add('collapsed');
  }

  // Handle resize
  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });
}

/* =============================================================================
   SEARCH
   ============================================================================= */
function setupSearch(main) {
  const input   = document.getElementById('org-search');
  const results = document.getElementById('org-search-results');
  if (!input || !results) return;

  // Build full-text index from all sections.
  // Prefers org's outline-text div (id="text-{headingId}") for direct section
  // content; falls back to collecting siblings until the next same-level heading.
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

  // Remove all in-document highlight marks inserted by a previous search.
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

  // Wrap every occurrence of `query` inside `container` with a <mark>.
  function highlightSection(headingId, query) {
    clearDocHighlights();
    const heading = document.getElementById(headingId);
    if (!heading) return;
    const container = heading.parentElement;
    const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

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
      }
      if (lastIdx < textNode.nodeValue.length) {
        frag.appendChild(document.createTextNode(textNode.nodeValue.slice(lastIdx)));
      }
      parent.replaceChild(frag, textNode);
    });
  }

  // Return a short excerpt of `text` centred around the first occurrence of `query`.
  function extractSnippet(text, query, maxLen = 160) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text.substring(0, maxLen);
    const start = Math.max(0, idx - 55);
    const end   = Math.min(text.length, idx + query.length + 100);
    let snippet = text.substring(start, end).replace(/\s+/g, ' ');
    if (start > 0) snippet = '\u2026' + snippet;
    if (end < text.length) snippet += '\u2026';
    return snippet.substring(0, maxLen + 4);
  }

  function doSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) { hide(); return; }

    const hits = index.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.text.toLowerCase().includes(q)
    ).slice(0, 10);

    if (hits.length === 0) {
      results.innerHTML = '<div class="search-no-results">No results found</div>';
    } else {
      results.innerHTML = hits.map((item, i) => {
        const preview = extractSnippet(item.text, q);
        return `
          <a href="#${item.id}" class="search-result-item" data-idx="${i}">
            <span class="search-result-level">${item.level}</span>
            <span class="search-result-title">${highlight(escapeHtml(item.title), q)}</span>
            ${preview ? `<span class="search-result-preview">${highlight(escapeHtml(preview), q)}</span>` : ''}
          </a>
        `;
      }).join('');
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
    if (e.key === 'Escape')     { input.value = ''; hide(); input.blur(); }
  });

  // Global Ctrl+K shortcut
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
      const q = input.value.trim().toLowerCase();
      const href = item.getAttribute('href');
      const id = href ? href.slice(1) : null;
      input.value = '';
      hide();
      // Highlight after the browser has scrolled to the anchor.
      if (id && q) setTimeout(() => highlightSection(id, q), 80);
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
    // Scroll TOC so active link is visible
    const sTop = sidebar.scrollTop;
    const sH   = sidebar.clientHeight;
    const lTop = link.offsetTop;
    const lH   = link.clientHeight;
    if (lTop < sTop + 24 || lTop + lH > sTop + sH - 24) {
      sidebar.scrollTo({ top: lTop - sH / 3, behavior: 'smooth' });
    }
  }

  const io = new IntersectionObserver(entries => {
    // Find the topmost intersecting heading
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
  main.querySelectorAll('pre.src, pre.example').forEach(pre => {
    // Wrap in a container
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    pre.classList.add('in-wrapper');

    // Detect language
    const langClass = Array.from(pre.classList).find(c => c.startsWith('src-'));
    const lang = langClass ? langClass.replace('src-', '') : (pre.classList.contains('example') ? 'text' : '');

    // Header bar
    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span class="code-lang">${escapeHtml(lang)}</span>
      <button class="copy-btn" title="Copy to clipboard"><i class="bi bi-clipboard"></i></button>
    `;
    wrapper.insertBefore(header, pre);

    header.querySelector('.copy-btn').addEventListener('click', function () {
      const text = pre.innerText;
      navigator.clipboard.writeText(text).then(() => {
        this.innerHTML = '<i class="bi bi-clipboard-check"></i>';
        this.classList.add('copied');
        setTimeout(() => {
          this.innerHTML = '<i class="bi bi-clipboard"></i>';
          this.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        // Fallback
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
   APPLY BOOTSTRAP CLASSES TO ORG ELEMENTS
   ============================================================================= */
function applyBootstrapClasses(main) {
  // Responsive tables
  main.querySelectorAll('table').forEach(table => {
    if (table.closest('.table-responsive')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-responsive';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  // Org tags in headings
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
  // html is already escaped; highlight the query term
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
}
