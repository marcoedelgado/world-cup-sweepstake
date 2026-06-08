import { loadAll, fixtureMode, withFixture } from './data.js';
import { renderHeader } from './render/header.js';
import { renderOwnerDetail } from './render/owner-detail.js';
import { renderFixtureBanner } from './render/fixture-banner.js';
import { escape } from './utils.js';

async function main() {
  const root = document.getElementById('owner');
  const params = new URLSearchParams(location.search);
  const name = params.get('name');

  if (!name) {
    paintShell(root);
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
  if (!owner) {
    paintShell(root);
    renderNotFound(root, `No owner named "${name}".`);
    return;
  }
  paint(root, state, owner);
  window.addEventListener('tz-change', () => paint(root, state, owner));
}

function paint(root, state, owner) {
  root.innerHTML = '';
  renderHeader(root);
  renderFixtureBanner(root, fixtureMode);
  renderOwnerDetail(root, state, owner);
}

function paintShell(root) {
  root.innerHTML = '';
  renderHeader(root);
  renderFixtureBanner(root, fixtureMode);
}

function renderNotFound(root, message) {
  const card = document.createElement('div');
  card.className = 'pn-empty';
  card.innerHTML = `${escape(message)} <a href="${withFixture('index.html')}">Back to the album</a>.`;
  root.appendChild(card);
}

main();
