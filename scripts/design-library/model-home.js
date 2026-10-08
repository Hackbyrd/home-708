(() => {
  const { photos, groupNames } = JSON.parse(document.getElementById('photo-data').textContent);
  const gallery = document.getElementById('photos');
  const dialog = document.getElementById('photo-viewer');
  const buttons = [...document.querySelectorAll('[data-group]')];
  let visible = [], index = 0;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function route() {
    const requested = location.hash.slice(1);
    const group = requested === 'exterior' ? 0 : Number(requested.replace('floor-', ''));
    const selected = requested && group >= 0 && group <= 4 && Number.isInteger(group) ? group : 1;
    visible = photos.filter(photo => photo.group === selected);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.group) === selected)));
    document.getElementById('gallery-title').textContent = groupNames[selected];
    document.getElementById('photo-count').textContent = `${visible.length} original photographs`;
    gallery.innerHTML = visible.map((photo, i) => `<figure class="original-card"><button type="button" data-photo="${i}" aria-label="Enlarge ${esc(photo.title)}"><img src="${esc(photo.src)}" alt="${esc(photo.title)} — original model home" loading="lazy" decoding="async"></button><figcaption>${esc(photo.title)}<small>Original model-home photograph · Click to enlarge</small></figcaption></figure>`).join('');
    gallery.querySelectorAll('[data-photo]').forEach(button => button.onclick = () => { index = Number(button.dataset.photo); updateViewer(); dialog.showModal(); });
    if (dialog.open) dialog.close();
  }
  function updateViewer() {
    const photo = visible[index];
    const image = document.getElementById('viewer-image');
    image.src = photo.src;
    image.alt = `${photo.title} — original model-home photograph`;
    document.getElementById('viewer-title').textContent = photo.title;
    document.getElementById('viewer-count').textContent = `${index + 1} / ${visible.length}`;
    document.getElementById('previous-photo').disabled = index === 0;
    document.getElementById('next-photo').disabled = index === visible.length - 1;
  }
  function step(delta) { if (index + delta >= 0 && index + delta < visible.length) { index += delta; updateViewer(); } }
  buttons.forEach(button => button.onclick = () => { location.hash = Number(button.dataset.group) === 0 ? 'exterior' : `floor-${button.dataset.group}`; });
  document.getElementById('close-viewer').onclick = () => dialog.close();
  document.getElementById('previous-photo').onclick = () => step(-1);
  document.getElementById('next-photo').onclick = () => step(1);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => { if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); } if (event.key === 'ArrowRight') { event.preventDefault(); step(1); } });
  window.addEventListener('hashchange', route);
  route();
})();
