(() => {
  // Prevent double injection
  if (document.getElementById('stickytab-root')) return;

  const PAGE_KEY = 'stickytab_' + location.hostname + location.pathname;
  const POS_KEY  = 'stickytab_pos';
  let notes = [];
  let isMinimized = false;
  let activeNoteIndex = 0;
  let savedPos = null;

  // ── Load notes from storage ──────────────────────────────────────────────
  function loadNotes(cb) {
    chrome.storage.local.get([PAGE_KEY, PAGE_KEY + '_meta', POS_KEY], (result) => {
      notes = result[PAGE_KEY] || [];
      const meta = result[PAGE_KEY + '_meta'] || {};
      isMinimized = meta.minimized || false;
      activeNoteIndex = Math.min(meta.activeIndex || 0, Math.max(0, notes.length - 1));
      savedPos = result[POS_KEY] || null;
      cb();
    });
  }

  function saveNotes() {
    chrome.storage.local.set({
      [PAGE_KEY]: notes,
      [PAGE_KEY + '_meta']: { minimized: isMinimized, activeIndex: activeNoteIndex }
    });
  }

  function savePos(top, left) {
    savedPos = { top, left };
    chrome.storage.local.set({ [POS_KEY]: savedPos });
  }

  // ── Build UI ─────────────────────────────────────────────────────────────
  function buildUI() {
    const root = document.createElement('div');
    root.id = 'stickytab-root';

    // Apply saved position (overrides CSS default top-right)
    if (savedPos) {
      root.style.top  = savedPos.top  + 'px';
      root.style.left = savedPos.left + 'px';
      root.style.right = 'auto';
    }

    document.body.appendChild(root);
    render(root);
    initDrag(root);
  }

  // ── Drag logic ────────────────────────────────────────────────────────────
  function initDrag(root) {
    let dragging = false;
    let startX, startY, startLeft, startTop;

    root.addEventListener('mousedown', (e) => {
      // Only drag from the header
      if (!e.target.closest('.st-header')) return;
      // Don't drag if clicking a button inside the header
      if (e.target.closest('button')) return;

      dragging = true;
      const rect = root.getBoundingClientRect();
      startX    = e.clientX;
      startY    = e.clientY;
      startLeft = rect.left;
      startTop  = rect.top;

      root.style.right = 'auto';
      root.style.left  = startLeft + 'px';
      root.style.top   = startTop  + 'px';
      root.classList.add('st-dragging');

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop  = startTop  + dy;

      // Keep within viewport
      const W = root.offsetWidth;
      const H = root.offsetHeight;
      newLeft = Math.max(0, Math.min(window.innerWidth  - W, newLeft));
      newTop  = Math.max(0, Math.min(window.innerHeight - H, newTop));

      root.style.left = newLeft + 'px';
      root.style.top  = newTop  + 'px';
    });

    document.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('st-dragging');
      savePos(parseFloat(root.style.top), parseFloat(root.style.left));
    });
  }

  function render(root) {
    root.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'st-wrapper' + (isMinimized ? ' st-minimized' : '');

    // ── Header ────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'st-header';

    const logo = document.createElement('span');
    logo.className = 'st-logo';
    logo.textContent = 'StickyTab';

    const headerActions = document.createElement('div');
    headerActions.className = 'st-header-actions';

    const addBtn = document.createElement('button');
    addBtn.className = 'st-btn st-btn-add';
    addBtn.title = 'New note';
    addBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    addBtn.addEventListener('click', addNote);

    const minBtn = document.createElement('button');
    minBtn.className = 'st-btn st-btn-min';
    minBtn.title = isMinimized ? 'Expand' : 'Minimise';
    minBtn.innerHTML = isMinimized
      ? `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    minBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      saveNotes();
      render(root);
    });

    headerActions.appendChild(addBtn);
    headerActions.appendChild(minBtn);
    header.appendChild(logo);
    header.appendChild(headerActions);
    wrapper.appendChild(header);

    if (!isMinimized) {
      // ── Tabs bar (multiple notes) ───────────────────────────────────────
      if (notes.length > 0) {
        const tabBar = document.createElement('div');
        tabBar.className = 'st-tabbar';

        notes.forEach((note, i) => {
          const tab = document.createElement('button');
          tab.className = 'st-tab' + (i === activeNoteIndex ? ' st-tab-active' : '');
          tab.textContent = note.title || `Note ${i + 1}`;
          tab.addEventListener('click', () => {
            activeNoteIndex = i;
            saveNotes();
            render(root);
          });
          tabBar.appendChild(tab);
        });

        wrapper.appendChild(tabBar);
      }

      // ── Note body ──────────────────────────────────────────────────────
      if (notes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'st-empty';
        empty.innerHTML = `<span>✏️</span><p>No notes yet.<br>Hit <strong>+</strong> to add one.</p>`;
        wrapper.appendChild(empty);
      } else {
        const note = notes[activeNoteIndex];

        // Title input
        const titleInput = document.createElement('input');
        titleInput.className = 'st-title-input';
        titleInput.placeholder = `Note ${activeNoteIndex + 1}`;
        titleInput.value = note.title || '';
        titleInput.maxLength = 40;
        titleInput.addEventListener('input', () => {
          notes[activeNoteIndex].title = titleInput.value;
          saveNotes();
          // update tab label live
          const tabs = root.querySelectorAll('.st-tab');
          if (tabs[activeNoteIndex]) {
            tabs[activeNoteIndex].textContent = titleInput.value || `Note ${activeNoteIndex + 1}`;
          }
        });

        // Textarea
        const ta = document.createElement('textarea');
        ta.className = 'st-textarea';
        ta.placeholder = 'Write your note here…';
        ta.value = note.content || '';
        ta.addEventListener('input', () => {
          notes[activeNoteIndex].content = ta.value;
          notes[activeNoteIndex].updatedAt = Date.now();
          saveNotes();
        });

        // Footer with delete + timestamp
        const footer = document.createElement('div');
        footer.className = 'st-footer';

        const ts = document.createElement('span');
        ts.className = 'st-ts';
        if (note.updatedAt) {
          ts.textContent = 'Saved ' + timeAgo(note.updatedAt);
        }

        const delBtn = document.createElement('button');
        delBtn.className = 'st-btn-delete';
        delBtn.title = 'Delete this note';
        delBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M5 3V1.5h2V3M4.5 9.5l-.5-5M7.5 9.5l.5-5M2.5 3l.8 7h5.4l.8-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Delete`;
        delBtn.addEventListener('click', deleteNote);

        footer.appendChild(ts);
        footer.appendChild(delBtn);

        wrapper.appendChild(titleInput);
        wrapper.appendChild(ta);
        wrapper.appendChild(footer);
      }
    }

    root.appendChild(wrapper);
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function addNote() {
    notes.push({ title: '', content: '', createdAt: Date.now(), updatedAt: Date.now() });
    activeNoteIndex = notes.length - 1;
    isMinimized = false;
    saveNotes();
    const root = document.getElementById('stickytab-root');
    render(root);
    // Focus textarea
    setTimeout(() => {
      const ta = root.querySelector('.st-textarea');
      if (ta) ta.focus();
    }, 50);
  }

  function deleteNote() {
    notes.splice(activeNoteIndex, 1);
    activeNoteIndex = Math.max(0, activeNoteIndex - 1);
    saveNotes();
    const root = document.getElementById('stickytab-root');
    render(root);
  }

  function timeAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
    return Math.floor(sec / 86400) + 'd ago';
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  loadNotes(buildUI);
})();
