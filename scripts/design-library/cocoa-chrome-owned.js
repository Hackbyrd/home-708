/* Keep this option's anchor targets below the actual shared header on every screen size. */
const cocoaChromeHeader = document.getElementById('design-library-header');
function measureCocoaChromeHeader() {
  const height = cocoaChromeHeader ? Math.ceil(cocoaChromeHeader.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty('--cc-header-height', height + 'px');
}
measureCocoaChromeHeader();
if (cocoaChromeHeader && typeof window.ResizeObserver !== 'undefined') {
  const cocoaChromeHeaderObserver = new window.ResizeObserver(measureCocoaChromeHeader);
  cocoaChromeHeaderObserver.observe(cocoaChromeHeader);
} else {
  window.addEventListener('resize', measureCocoaChromeHeader, { passive: true });
}
