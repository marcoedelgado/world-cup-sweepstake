import { isAlive } from '../standings.js';
import { teamByCode, withFixture } from '../data.js';
import { escape } from '../utils.js';
import { FEATURES } from '../config.js';
import { pickLiveMatches } from './live.js';

function liveCodeSet(matches) {
  const live = pickLiveMatches(matches, new Date().toISOString());
  const codes = new Set();
  for (const m of live) { codes.add(m.home); codes.add(m.away); }
  return codes;
}

function ownerCardWrapper(owner) {
  if (!FEATURES.ownerDetail) {
    const div = document.createElement('div');
    div.className = 'pn-owner';
    return div;
  }
  const a = document.createElement('a');
  a.className = 'pn-owner clickable';
  a.href = withFixture(`owner.html?name=${encodeURIComponent(owner.name)}`);
  a.innerHTML = `<span class="pn-chev">›</span>`;
  return a;
}

export function renderAlbumGroup(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Who owns what</h3>`;

  const matches = results.matches ?? [];
  const liveCodes = liveCodeSet(matches);

  const grid = document.createElement('div');
  grid.className = 'pn-owners';

  for (const owner of owners.owners ?? []) {
    grid.appendChild(renderOwnerCardGroup(owner, teams, matches, liveCodes));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

export function renderAlbumHeat(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Heat Check</h3>`;

  const matches = results.matches ?? [];
  const liveCodes = liveCodeSet(matches);

  const ordered = [...(owners.owners ?? [])].map((o, i) => ({
    owner: o,
    aliveCount: (o.teams ?? []).filter((c) => isAlive(c, teams, matches)).length,
    drawOrder: i,
  }));
  ordered.sort((a, b) => b.aliveCount - a.aliveCount || a.drawOrder - b.drawOrder);

  const grid = document.createElement('div');
  grid.className = 'pn-owners heat';

  for (const { owner, aliveCount } of ordered) {
    grid.appendChild(renderOwnerCardHeat(owner, aliveCount, teams, matches, liveCodes));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

function renderOwnerCardGroup(owner, teams, matches, liveCodes) {
  const card = ownerCardWrapper(owner);

  const aliveCount = (owner.teams ?? []).filter((c) => isAlive(c, teams, matches)).length;
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches, liveCodes))
    .join('');

  card.insertAdjacentHTML('beforeend', `
    <div class="pn-owner-name">
      <span>${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `);
  return card;
}

function renderOwnerCardHeat(owner, aliveCount, teams, matches, liveCodes) {
  const card = ownerCardWrapper(owner);
  if (aliveCount === 0) card.classList.add('zero-alive');

  const heatPrefix = aliveCount > 0 ? '🔥 ' : '';
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches, liveCodes))
    .join('');

  card.insertAdjacentHTML('beforeend', `
    <div class="pn-owner-name">
      <span>${heatPrefix}${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} / 8 alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `);
  return card;
}

function stickerHtml(code, teams, matches, liveCodes) {
  const t = teamByCode(teams, code);
  const liveCls = liveCodes?.has(code) ? ' live' : '';
  if (!t) return `<div class="pn-sticker out${liveCls}" data-team="${escape(code)}"><span class="flag">❓</span><span class="code">${escape(code)}</span></div>`;
  const outCls = isAlive(code, teams, matches) ? '' : ' out';
  return `<div class="pn-sticker${outCls}${liveCls}" data-team="${escape(t.code)}" title="${escape(t.name)}"><span class="flag">${t.flag}</span><span class="code">${escape(t.code)}</span></div>`;
}

