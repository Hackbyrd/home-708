const initializedHeaders = new WeakMap();

// Shared by generated review pages and the Vue Explorations page.
export function initializeDesignLibraryHeader(scope = document) {
  const header = scope.querySelector('#design-library-header');
  const dialog = scope.querySelector('#dl-blueprint');
  const openButton = scope.querySelector('#dl-blueprint-open');
  const closeButton = scope.querySelector('#dl-blueprint-close');
  const image = scope.querySelector('#dl-blueprint-image');
  const imageLink = scope.querySelector('#dl-blueprint-image-link');
  const planButtons = [...scope.querySelectorAll('[data-blueprint-src]')];
  const viewport = scope.querySelector('.dl-blueprint-plan-viewport');
  if (!header || !dialog || !openButton || !closeButton || !image || !imageLink || !planButtons.length) return () => {};
  if (initializedHeaders.has(header)) return initializedHeaders.get(header);

  let lastTrigger = openButton;
  const pathname = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  const section = window.location.hash.startsWith('#/explorations') || pathname === '/explorations'
    ? 'explorations'
    : pathname === '/mineral-walnut-roadmap' ? 'move-in' : 'designs';
  header.querySelectorAll('[data-library-section]').forEach(link => {
    if (link.dataset.librarySection === section) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  function openBlueprint() {
    lastTrigger = openButton;
    if (!image.getAttribute('src')) showPlan(planButtons.find(button => button.getAttribute('aria-pressed') === 'true') || planButtons[0]);
    if (!dialog.open) dialog.showModal();
  }

  function showPlan(button) {
    image.src = button.dataset.blueprintSrc;
    image.alt = button.dataset.blueprintTitle + ' — builder blueprint';
    imageLink.href = button.dataset.blueprintSrc;
    imageLink.setAttribute('aria-label', 'Open ' + button.dataset.blueprintTitle + ' plan image in a new tab');
    planButtons.forEach(plan => plan.setAttribute('aria-pressed', String(plan === button)));
    if (viewport) viewport.scrollTop = 0;
  }
  function onPlanClick(event) { showPlan(event.currentTarget); }

  function closeBlueprint() { dialog.close(); }
  function onBackdropClick(event) { if (event.target === dialog) closeBlueprint(); }
  function onDialogKey(event) {
    // Keep the SPA's Escape handler from closing Explorations behind the modal.
    if (event.key === 'Escape') event.stopPropagation();
  }
  function onClose() {
    if (lastTrigger.isConnected) lastTrigger.focus({ preventScroll: true });
  }

  openButton.addEventListener('click', openBlueprint);
  closeButton.addEventListener('click', closeBlueprint);
  planButtons.forEach(button => button.addEventListener('click', onPlanClick));
  dialog.addEventListener('click', onBackdropClick);
  dialog.addEventListener('keydown', onDialogKey);
  dialog.addEventListener('close', onClose);

  function dispose() {
    openButton.removeEventListener('click', openBlueprint);
    closeButton.removeEventListener('click', closeBlueprint);
    planButtons.forEach(button => button.removeEventListener('click', onPlanClick));
    dialog.removeEventListener('click', onBackdropClick);
    dialog.removeEventListener('keydown', onDialogKey);
    dialog.removeEventListener('close', onClose);
    if (dialog.open) dialog.close();
    initializedHeaders.delete(header);
  }
  initializedHeaders.set(header, dispose);
  return dispose;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeDesignLibraryHeader(), { once: true });
} else {
  initializeDesignLibraryHeader();
}
