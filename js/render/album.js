import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { escape } from '../utils.js';

export function renderAlbum(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Who owns what</h3>`;

  const grid = document.createElement('div');
  grid.className = 'pn-owners';

  for (const owner of owners.owners ?? []) {
    grid.appendChild(renderOwnerCard(owner, teams, results.matches ?? []));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

function renderOwnerCard(owner, teams, matches) {
  const card = document.createElement('div');
  card.className = 'pn-owner';

  const aliveCount = (owner.teams ?? []).filter((c) => isAlive(c, teams, matches)).length;
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches))
    .join('');

  card.innerHTML = `
    <div class="pn-owner-name">
      <span>${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `;
  return card;
}

function stickerHtml(code, teams, matches) {
  const t = teamByCode(teams, code);
  if (!t) return `<div class="pn-sticker out"><span class="flag">❓</span><span class="code">${escape(code)}</span></div>`;
  const outCls = isAlive(code, teams, matches) ? '' : ' out';
  return `<div class="pn-sticker${outCls}" title="${escape(t.name)}"><span class="flag">${t.flag}</span><span class="code">${escape(t.code)}</span></div>`;
}

