const cards = [...document.querySelectorAll('.inventory-card')];
const search = document.querySelector('#furniture-search');
const filters = [...document.querySelectorAll('[data-furniture-category]')];
const count = document.querySelector('#inventory-result-count');
const empty = document.querySelector('#inventory-empty');
const dialog = document.querySelector('#furniture-viewer');
const photos = JSON.parse(document.querySelector('#furniture-image-data').textContent);
let category = 'all';
let activeId = '';
let lastTrigger;

function updateFilter() {
  const term = search.value.trim().toLowerCase();
  cards.forEach(card => { card.hidden = !(category === 'all' || card.dataset.category === category) || !card.dataset.search.includes(term); });
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.furnitureCategory === category)));
  const visible = cards.filter(card => !card.hidden).length;
  count.textContent = `Showing ${visible} of ${cards.length} entries`;
  empty.hidden = visible !== 0;
}
search.addEventListener('input', updateFilter);
filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.furnitureCategory; updateFilter(); }));
document.querySelector('#inventory-reset').addEventListener('click', () => { search.value = ''; category = 'all'; updateFilter(); search.focus(); });

function visiblePhotos() {
  const ids = new Set(cards.filter(card => !card.hidden).map(card => card.id));
  return photos.filter(photo => ids.has(photo.id));
}
function showPhoto(id) {
  const available = visiblePhotos();
  const index = available.findIndex(photo => photo.id === id);
  if (index < 0) return;
  const photo = available[index];
  activeId = id;
  const image = document.querySelector('#furniture-viewer-image');
  image.src = photo.src;
  image.alt = `RH reference: ${photo.name}`;
  document.querySelector('#furniture-viewer-title').textContent = photo.name;
  document.querySelector('#furniture-viewer-note').textContent = photo.note;
  document.querySelector('#furniture-viewer-count').textContent = `${index + 1} / ${available.length}`;
  document.querySelector('#furniture-viewer-prev').disabled = index === 0;
  document.querySelector('#furniture-viewer-next').disabled = index === available.length - 1;
  document.querySelector('#furniture-viewer-rh').href = photo.url;
}
function stepPhoto(direction) {
  const available = visiblePhotos();
  const index = available.findIndex(photo => photo.id === activeId);
  const next = available[index + direction];
  if (next) showPhoto(next.id);
}
document.querySelectorAll('[data-furniture-image]').forEach(button => button.addEventListener('click', () => {
  lastTrigger = button;
  showPhoto(button.dataset.furnitureImage);
  dialog.showModal();
}));
document.querySelector('#furniture-viewer-close').addEventListener('click', () => dialog.close());
document.querySelector('#furniture-viewer-prev').addEventListener('click', () => stepPhoto(-1));
document.querySelector('#furniture-viewer-next').addEventListener('click', () => stepPhoto(1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stepPhoto(event.key === 'ArrowLeft' ? -1 : 1); }
});
dialog.addEventListener('close', () => lastTrigger?.focus({ preventScroll: true }));
let touchStart;
document.querySelector('#furniture-viewer-image').addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? event.touches[0].clientX : undefined; }, { passive: true });
document.querySelector('#furniture-viewer-image').addEventListener('touchend', event => {
  if (touchStart == null || !event.changedTouches.length) return;
  const delta = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(delta) > 65) stepPhoto(delta > 0 ? -1 : 1);
  touchStart = undefined;
}, { passive: true });
