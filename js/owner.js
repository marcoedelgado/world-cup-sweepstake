import { loadAll } from './data.js';
import { renderHeader } from './render/header.js';
import { renderOwnerDetail } from './render/owner-detail.js';
import { escape } from './utils.js';

async function main() {
  const root = document.getElementById('owner');
  const params = new URLSearchParams(location.search);
  const name = params.get('name');

  if (!name) {
    renderHeader(root);
    renderNotFound(root, 'No owner specified.');
    return;
  }

  let state;
  try {
    state = await loadAll();
  } catch (err) {
    root.innerHTML = `<p class="error">Couldn't load tournament data — ${escape(err.message)}</p>`;
    return;
  }

  const owner = (state.owners?.owners ?? []).find((o) => o.name === name);
  root.innerHTML = '';
  renderHeader(root);
  if (!owner) {
    renderNotFound(root, `No owner named "${name}".`);
    return;
  }
  renderOwnerDetail(root, state, owner);
  window.addEventListener('tz-change', () => {
    root.innerHTML = '';
    renderHeader(root);
    renderOwnerDetail(root, state, owner);
  });
}

function renderNotFound(root, message) {
  const card = document.createElement('div');
  card.className = 'pn-empty';
  card.innerHTML = `${escape(message)} <a href="index.html">Back to the album</a>.`;
  root.appendChild(card);
}

main();
