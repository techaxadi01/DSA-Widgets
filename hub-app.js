/**
 * DSA Study Hub — Interactive Application Logic (Sidebar & Compact Grid Layout)
 */

(function () {
  'use strict';

  // State Management
  const state = {
    widgets: Array.isArray(window.DSA_WIDGETS) ? window.DSA_WIDGETS : [],
    selectedCategory: 'ALL',
    selectedTag: null,
    searchQuery: '',
    sortBy: 'recent',
    activePreviewWidget: null,
    viewMode: 'grid'
  };

  // DOM Elements
  const widgetsContainer = document.getElementById('widgetsGrid');
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClear');
  const categorySidebarList = document.getElementById('categorySidebarList');
  const categoryTotalCountEl = document.getElementById('categoryTotalCount');
  const sidebarTagsList = document.getElementById('sidebarTagsList');
  const sortSelect = document.getElementById('sortSelect');
  const resultsIndicator = document.getElementById('resultsIndicator');
  const activeFilterBar = document.getElementById('activeFilterBar');
  const filterDescText = document.getElementById('filterDescText');
  const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
  const guideToggleBtn = document.getElementById('guideToggleBtn');
  const guideCard = document.getElementById('guideCard');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');

  // Modal Elements
  const previewModal = document.getElementById('previewModal');
  const modalIframe = document.getElementById('modalIframe');
  const modalTitle = document.getElementById('modalTitle');
  const modalBadge = document.getElementById('modalBadge');
  const modalExternalLink = document.getElementById('modalExternalLink');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalMaximizeBtn = document.getElementById('modalMaximizeBtn');

  // Render Sidebar Categories
  function renderSidebarCategories() {
    if (!categorySidebarList) return;

    if (categoryTotalCountEl) {
      categoryTotalCountEl.textContent = state.widgets.length;
    }

    if (state.widgets.length === 0) {
      categorySidebarList.innerHTML = `
        <div style="font-size:12px; color:var(--ink-muted); padding:8px 10px;">
          No visualizers yet. Drop .html files here and run update-widgets.bat!
        </div>
      `;
      return;
    }

    const catData = {
      ALL: { count: state.widgets.length, icon: '📚', label: 'All Visualizers' }
    };

    state.widgets.forEach(w => {
      const cat = w.category || 'General DSA';
      if (!catData[cat]) {
        catData[cat] = {
          count: 0,
          icon: w.categoryIcon || '📁',
          label: cat
        };
      }
      catData[cat].count += 1;
    });

    const categories = ['ALL', ...Object.keys(catData).filter(c => c !== 'ALL')];

    categorySidebarList.innerHTML = categories.map(cat => {
      const isActive = state.selectedCategory === cat;
      const item = catData[cat];
      return `
        <button class="sidebar-item ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat)}">
          <span class="sidebar-item-left">
            <span class="sidebar-icon">${item.icon}</span>
            <span>${escapeHtml(item.label)}</span>
          </span>
          <span class="sidebar-count">${item.count}</span>
        </button>
      `;
    }).join('');

    categorySidebarList.querySelectorAll('.sidebar-item').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedCategory = btn.getAttribute('data-category');
        state.selectedTag = null;
        renderSidebarCategories();
        renderSidebarTags();
        renderWidgets();
      });
    });
  }

  // Render Sidebar Popular Tags
  function renderSidebarTags() {
    if (!sidebarTagsList) return;

    if (state.widgets.length === 0) {
      sidebarTagsList.innerHTML = `
        <div style="font-size:11px; color:var(--ink-muted);">No tags available</div>
      `;
      return;
    }

    const tagCounts = {};
    state.widgets.forEach(w => {
      (w.tags || []).forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 10);

    sidebarTagsList.innerHTML = sortedTags.map(tag => {
      const isActive = state.selectedTag === tag;
      return `
        <button class="sidebar-tag-pill ${isActive ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
          #${escapeHtml(tag)} (${tagCounts[tag]})
        </button>
      `;
    }).join('');

    sidebarTagsList.querySelectorAll('.sidebar-tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag');
        state.selectedTag = state.selectedTag === tag ? null : tag;
        renderSidebarTags();
        renderWidgets();
      });
    });
  }

  // Filter & Sort Logic
  function getFilteredAndSortedWidgets() {
    let list = [...state.widgets];

    if (state.selectedCategory !== 'ALL') {
      list = list.filter(w => w.category === state.selectedCategory);
    }

    if (state.selectedTag) {
      list = list.filter(w => (w.tags || []).includes(state.selectedTag));
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(w => {
        const title = (w.title || '').toLowerCase();
        const subtitle = (w.subtitle || '').toLowerCase();
        const stamp = (w.stamp || '').toLowerCase();
        const desc = (w.description || '').toLowerCase();
        const fn = (w.filename || '').toLowerCase();
        const tags = (w.tags || []).join(' ').toLowerCase();
        const cat = (w.category || '').toLowerCase();

        return (
          title.includes(q) ||
          subtitle.includes(q) ||
          stamp.includes(q) ||
          desc.includes(q) ||
          fn.includes(q) ||
          tags.includes(q) ||
          cat.includes(q)
        );
      });
    }

    if (state.sortBy === 'recent') {
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (state.sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (state.sortBy === 'category') {
      list.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    } else if (state.sortBy === 'time') {
      list.sort((a, b) => (a.estimatedMinutes || 10) - (b.estimatedMinutes || 10));
    }

    return list;
  }

  function updateFilterIndicators(filteredCount) {
    if (resultsIndicator) {
      resultsIndicator.textContent = `${filteredCount} visualizer${filteredCount === 1 ? '' : 's'}`;
    }

    const hasFilters = state.selectedCategory !== 'ALL' || state.selectedTag || state.searchQuery.trim();

    if (activeFilterBar) {
      if (hasFilters) {
        activeFilterBar.style.display = 'flex';
        const parts = [];
        if (state.selectedCategory !== 'ALL') parts.push(`Topic: ${state.selectedCategory}`);
        if (state.selectedTag) parts.push(`Tag: #${state.selectedTag}`);
        if (state.searchQuery.trim()) parts.push(`"${state.searchQuery.trim()}"`);
        if (filterDescText) filterDescText.textContent = `Filtered by: ${parts.join(' • ')}`;
      } else {
        activeFilterBar.style.display = 'none';
      }
    }
  }

  // Render Compact Widget Cards
  function renderWidgets() {
    if (!widgetsContainer) return;

    if (state.widgets.length === 0) {
      widgetsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3 class="empty-title">Welcome to Your DSA Study Hub</h3>
          <p class="empty-subtitle">Your folder is ready. Whenever you add widgets from your professor, double-click <strong>update-widgets.bat</strong>!</p>
          <button class="btn-compact" onclick="document.getElementById('guideCard').classList.add('open')">⚡ View How to Add Widgets</button>
        </div>
      `;
      updateFilterIndicators(0);
      return;
    }

    const filtered = getFilteredAndSortedWidgets();
    updateFilterIndicators(filtered.length);

    if (filtered.length === 0) {
      widgetsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3 class="empty-title">No Visualizers Match Your Filter</h3>
          <p class="empty-subtitle">Try selecting "All Visualizers" in the left sidebar or clearing your search.</p>
          <button class="btn-compact" id="resetFiltersBtn">Reset All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    widgetsContainer.innerHTML = filtered.map(w => {
      const catColor = w.categoryColor || '#c89b3c';
      const catIcon = w.categoryIcon || '📚';

      return `
        <article class="widget-card" data-id="${escapeHtml(w.id)}" id="card-${escapeHtml(w.id)}">
          <header class="card-header">
            <span class="category-tag" style="border-color: ${catColor}35; color: ${catColor};">
              <span>${catIcon}</span>
              <span>${escapeHtml(w.category)}</span>
            </span>

            <span class="card-spec">⏱️ ${w.estimatedMinutes || 10}m</span>
          </header>

          <h2 class="card-title">
            <a href="${encodeURI(w.filename)}" target="_blank" rel="noopener">
              ${escapeHtml(w.title)}
            </a>
          </h2>

          <div class="card-subtitle">${escapeHtml(w.subtitle || w.stamp || '')}</div>

          <p class="card-description">${escapeHtml(w.description || '')}</p>

          <div class="card-tags">
            ${(w.tags || []).map(t => `<span class="tag-pill" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`).join('')}
          </div>

          <footer class="card-actions">
            <a href="${encodeURI(w.filename)}" class="btn-primary" target="_blank" rel="noopener">
              <span>Launch ↗</span>
            </a>

            <button class="btn-ghost" data-action="quick-preview" data-id="${escapeHtml(w.id)}">
              <span>Preview 👁️</span>
            </button>
          </footer>
        </article>
      `;
    }).join('');

    attachCardEventListeners();
  }

  // Attach Card Event Listeners
  function attachCardEventListeners() {
    widgetsContainer.querySelectorAll('[data-action="quick-preview"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const widget = state.widgets.find(w => w.id === id);
        if (widget) openPreviewModal(widget);
      });
    });

    widgetsContainer.querySelectorAll('.tag-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = pill.getAttribute('data-tag');
        if (tag) {
          state.selectedTag = tag;
          renderSidebarTags();
          renderWidgets();
        }
      });
    });
  }

  function openPreviewModal(widget) {
    state.activePreviewWidget = widget;
    if (!previewModal) return;

    modalTitle.textContent = widget.title;
    modalBadge.textContent = widget.category;
    modalExternalLink.href = widget.filename;
    modalIframe.src = widget.filename;

    previewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('active');
    modalIframe.src = 'about:blank';
    document.body.style.overflow = '';
    state.activePreviewWidget = null;
  }

  function resetAllFilters() {
    state.searchQuery = '';
    state.selectedCategory = 'ALL';
    state.selectedTag = null;
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.style.display = 'none';

    renderSidebarCategories();
    renderSidebarTags();
    renderWidgets();
  }

  function initControls() {
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.searchQuery = searchInput.value;
        if (searchClearBtn) {
          searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
        }
        renderWidgets();
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        renderWidgets();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        state.sortBy = sortSelect.value;
        renderWidgets();
      });
    }

    if (clearAllFiltersBtn) {
      clearAllFiltersBtn.addEventListener('click', resetAllFilters);
    }

    if (viewGridBtn && viewListBtn && widgetsContainer) {
      viewGridBtn.addEventListener('click', () => {
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
        widgetsContainer.classList.remove('list-view');
        state.viewMode = 'grid';
      });

      viewListBtn.addEventListener('click', () => {
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
        widgetsContainer.classList.add('list-view');
        state.viewMode = 'list';
      });
    }

    if (guideToggleBtn && guideCard) {
      guideToggleBtn.addEventListener('click', () => {
        guideCard.classList.toggle('open');
      });
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePreviewModal);

    if (previewModal) {
      previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closePreviewModal();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && previewModal && previewModal.classList.contains('active')) {
        closePreviewModal();
      }
    });

    if (modalMaximizeBtn) {
      modalMaximizeBtn.addEventListener('click', () => {
        const win = previewModal.querySelector('.modal-window');
        if (win) {
          if (win.style.maxWidth === '100vw') {
            win.style.maxWidth = '1100px';
            win.style.height = '88vh';
            modalMaximizeBtn.textContent = '⛶ Maximize';
          } else {
            win.style.maxWidth = '100vw';
            win.style.height = '100vh';
            modalMaximizeBtn.textContent = '❐ Restore';
          }
        }
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function init() {
    renderSidebarCategories();
    renderSidebarTags();
    renderWidgets();
    initControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
