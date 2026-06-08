import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { escape } from '../utils.js';

export function renderAlbumGroup(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Who owns what</h3>`;

  const grid = document.createElement('div');
  grid.className = 'pn-owners';

  for (const owner of owners.owners ?? []) {
    grid.appendChild(renderOwnerCardGroup(owner, teams, results.matches ?? []));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

export function renderAlbumHeat(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Heat Check</h3>`;

  const ordered = [...(owners.owners ?? [])].map((o, i) => ({
    owner: o,
    aliveCount: (o.teams ?? []).filter((c) => isAlive(c, teams, results.matches ?? [])).length,
    drawOrder: i,
  }));
  ordered.sort((a, b) => b.aliveCount - a.aliveCount || a.drawOrder - b.drawOrder);

  const grid = document.createElement('div');
  grid.className = 'pn-owners heat';

  for (const { owner, aliveCount } of ordered) {
    grid.appendChild(renderOwnerCardHeat(owner, aliveCount, teams, results.matches ?? []));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

function renderOwnerCardGroup(owner, teams, matches) {
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

function renderOwnerCardHeat(owner, aliveCount, teams, matches) {
  const card = document.createElement('div');
  card.className = 'pn-owner';
  if (aliveCount === 0) card.classList.add('zero-alive');

  const heatPrefix = aliveCount > 0 ? '🔥 ' : '';
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches))
    .join('');

  card.innerHTML = `
    <div class="pn-owner-name">
      <span>${heatPrefix}${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} / 8 alive</span>
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

// Back-compat: legacy single-entry export kept for any caller not yet phase-aware.
export const renderAlbum = renderAlbumGroup;
