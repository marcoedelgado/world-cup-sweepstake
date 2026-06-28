import { teamByCode, ownerForTeam } from '../data.js';
import { formatMatchDateTime } from '../tz.js';
import { escape, ownerTag, flag } from '../utils.js';

// Rounds 16 → Final live in the mirror bracket. R32 has its own flat section above.
const MIRROR_ROUNDS = [
  { key: 'r16',   label: 'Round of 16',    tab: 'R16', expected: 8 },
  { key: 'qf',    label: 'Quarter-Finals', tab: 'QF',  expected: 4 },
  { key: 'sf',    label: 'Semi-Finals',    tab: 'SF',  expected: 2 },
  { key: 'final', label: 'Final',          tab: '🏆',  expected: 1 },
];

// Linear chain used by the mobile focal layout (R32 → R16 → QF → SF → Final).
// 3rd-place is a leaf with no "next" round.
const MOBILE_ROUNDS = [
  { key: 'r32',   label: 'Round of 32',    tab: 'R32', expected: 16, next: 'r16' },
  { key: 'r16',   label: 'Round of 16',    tab: 'R16', expected: 8,  next: 'qf' },
  { key: 'qf',    label: 'Quarter-Finals', tab: 'QF',  expected: 4,  next: 'sf' },
  { key: 'sf',    label: 'Semi-Finals',    tab: 'SF',  expected: 2,  next: 'final' },
  { key: 'final', label: 'Final',          tab: '🏆',  expected: 1,  next: null },
  { key: 'third', label: '3rd Place',      tab: '3rd', expected: 1,  next: null },
];

export function renderBracket(container, { teams, owners, results }) {
  const matches = results?.matches ?? [];

  const r32 = matches.filter((m) => m.stage === 'r32');
  const r32Complete = r32.length === 16 && r32.every((m) => m.status === 'finished');

  // Desktop: existing mirror bracket + flat R32 section, ordered by phase.
  const desktopWrap = document.createElement('div');
  desktopWrap.className = 'br-desktop';
  const r32Section = renderR32Section(matches, teams, owners);
  const knockoutsSection = renderKnockoutsSection(matches, teams, owners);
  if (r32Complete) {
    desktopWrap.appendChild(knockoutsSection);
    desktopWrap.appendChild(r32Section);
  } else {
    desktopWrap.appendChild(r32Section);
    desktopWrap.appendChild(knockoutsSection);
  }
  container.appendChild(desktopWrap);

  // Mobile: focal-round detail + next-round pair cards (one column each).
  container.appendChild(renderMobileBracket(matches, teams, owners));
}

function renderMobileBracket(matches, teams, owners) {
  const wrap = document.createElement('section');
  wrap.className = 'br-mobile pn-section';

  const focalKey = pickDefaultFocal(matches);

  const tabs = document.createElement('div');
  tabs.className = 'br-mtabs';
  tabs.innerHTML = MOBILE_ROUNDS.map((r) => {
    const done = roundIsDone(r, matches);
    const cls = ['br-mtab', done ? 'done' : '', r.key === focalKey ? 'active' : '']
      .filter(Boolean)
      .join(' ');
    return `<button type="button" class="${cls}" data-target="${r.key}">${escape(r.tab)}</button>`;
  }).join('');
  wrap.appendChild(tabs);

  const stage = document.createElement('div');
  stage.className = 'br-mstage';
  wrap.appendChild(stage);

  renderMobileStage(stage, focalKey, matches, teams, owners);

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.br-mtab');
    if (!btn) return;
    const target = btn.dataset.target;
    if (!target) return;
    tabs.querySelectorAll('.br-mtab').forEach((b) => b.classList.toggle('active', b === btn));
    renderMobileStage(stage, target, matches, teams, owners);
  });

  return wrap;
}

function pickDefaultFocal(matches) {
  // First round (in linear order) that isn't fully done. Skip 3rd-place — it's
  // a leaf the user can opt into, not a sensible default.
  for (const r of MOBILE_ROUNDS) {
    if (r.key === 'third') continue;
    if (!roundIsDone(r, matches)) return r.key;
  }
  return 'final';
}

function roundIsDone(round, matches) {
  const list = matches.filter((m) => m.stage === round.key);
  if (list.length < round.expected) return false;
  return list.every((m) => m.status === 'finished');
}

function renderMobileStage(stage, focalKey, matches, teams, owners) {
  const focal = MOBILE_ROUNDS.find((r) => r.key === focalKey);
  const next = focal.next ? MOBILE_ROUNDS.find((r) => r.key === focal.next) : null;

  const focalMatches = matches
    .filter((m) => m.stage === focal.key)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));

  const focalCells = [];
  for (let i = 0; i < focal.expected; i++) {
    focalCells.push(i < focalMatches.length
      ? focalCellHtml(focalMatches[i], teams, owners)
      : focalPlaceholderHtml());
  }

  let nextHtml = '';
  if (next) {
    const nextMatches = matches
      .filter((m) => m.stage === next.key)
      .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
    const nextCells = [];
    for (let i = 0; i < next.expected; i++) {
      nextCells.push(i < nextMatches.length
        ? nextPairHtml(nextMatches[i], teams, owners)
        : nextPlaceholderHtml());
    }
    nextHtml = `
      <div class="br-mnext">
        <div class="br-col-label">${escape(next.tab)}</div>
        <div class="br-mcells">${nextCells.join('')}</div>
      </div>
    `;
  }

  stage.innerHTML = `
    <div class="br-mfocal">
      <div class="br-col-label">${escape(focal.label)}</div>
      <div class="br-mcells">${focalCells.join('')}</div>
    </div>
    ${nextHtml}
  `;
}

function focalCellHtml(m, teams, owners) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(owners, m.home);
  const awayOwner = ownerForTeam(owners, m.away);
  const finished = m.status === 'finished';
  const homeLost = finished && m.homeScore < m.awayScore;
  const awayLost = finished && m.awayScore < m.homeScore;
  return `
  <div class="br-fm">
    <div class="br-fm-row${homeLost ? ' lost' : ''}" data-full="${escape(home?.name ?? m.home ?? '')}" title="${escape(home?.name ?? m.home ?? '')}">
      <span class="pn-sticker"><span class="flag">${flag(home)}</span><span class="code">${escape(m.home ?? '?')}</span></span>
      ${ownerTag(homeOwner)}
      <span class="br-fm-sc">${escape(String(m.homeScore ?? ''))}</span>
    </div>
    <div class="br-fm-row${awayLost ? ' lost' : ''}" data-full="${escape(away?.name ?? m.away ?? '')}" title="${escape(away?.name ?? m.away ?? '')}">
      <span class="pn-sticker"><span class="flag">${flag(away)}</span><span class="code">${escape(m.away ?? '?')}</span></span>
      ${ownerTag(awayOwner)}
      <span class="br-fm-sc">${escape(String(m.awayScore ?? ''))}</span>
    </div>
    <div class="br-fm-when">${m.kickoff ? formatMatchDateTime(m.kickoff) : 'TBD'}</div>
  </div>
`;
}

function focalPlaceholderHtml() {
  return `
    <div class="br-fm br-fm-tbd">
      <div class="br-fm-row"><span class="pn-sticker out"></span><span class="br-fm-code">TBD</span></div>
      <div class="br-fm-row"><span class="pn-sticker out"></span><span class="br-fm-code">TBD</span></div>
    </div>
  `;
}

function nextPairHtml(m, teams, owners) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(owners, m.home);
  const awayOwner = ownerForTeam(owners, m.away);
  const finished = m.status === 'finished';
  return `
    <div class="br-nc">
      <div class="br-nc-row" data-full="${escape(home?.name ?? m.home ?? '')}" title="${escape(home?.name ?? m.home ?? '')}">
        <span class="pn-sticker"><span class="flag">${flag(home)}</span><span class="code">${escape(m.home ?? '?')}</span></span>
        ${ownerTag(homeOwner)}
        <span class="br-nc-sc">${escape(String(m.homeScore ?? (finished ? '' : '')))}</span>
      </div>
      <div class="br-nc-row" data-full="${escape(away?.name ?? m.away ?? '')}" title="${escape(away?.name ?? m.away ?? '')}">
        <span class="pn-sticker"><span class="flag">${flag(away)}</span><span class="code">${escape(m.away ?? '?')}</span></span>
        ${ownerTag(awayOwner)}
        <span class="br-nc-sc">${escape(String(m.awayScore ?? (finished ? '' : '')))}</span>
      </div>
      ${m.kickoff ? `<div class="br-nc-when">${formatMatchDateTime(m.kickoff)}</div>` : ''}
    </div>
  `;
}

function nextPlaceholderHtml() {
  return `
    <div class="br-nc br-nc-tbd">
      <div class="br-nc-row"><span class="pn-sticker out"></span><span class="br-nc-code">TBD</span></div>
      <div class="br-nc-row"><span class="pn-sticker out"></span><span class="br-nc-code">TBD</span></div>
    </div>
  `;
}

function renderR32Section(matches, teams, owners) {
  const section = document.createElement('section');
  section.className = 'pn-section br-r32-section';

  const real = matches
    .filter((m) => m.stage === 'r32')
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
  const cells = [];
  for (let i = 0; i < 16; i++) {
    cells.push(i < real.length
      ? cellHtml(real[i], teams, owners)
      : placeholderCellHtml());
  }
  section.innerHTML = `
    <h3>Round of 32</h3>
    <div class="br-r32-grid">${cells.join('')}</div>
  `;
  return section;
}

function renderKnockoutsSection(matches, teams, owners) {
  const section = document.createElement('section');
  section.className = 'pn-section br-knockouts-section';
  section.innerHTML = `<h3>Knockouts</h3>`;

  // Tabs are hidden on desktop via CSS; scroll-snap navigation on mobile.
  const tabs = document.createElement('div');
  tabs.className = 'br-tabs';
  tabs.innerHTML = MIRROR_ROUNDS.map((r, i) =>
    `<button type="button" class="br-tab${i === 0 ? ' active' : ''}" data-target="${r.key}">${escape(r.tab)}</button>`
  ).join('') + `<button type="button" class="br-tab" data-target="third">3rd</button>`;
  section.appendChild(tabs);

  const scroller = document.createElement('div');
  scroller.className = 'br-scroll';
  for (const r of MIRROR_ROUNDS) {
    scroller.appendChild(renderMirrorRound(r, matches, teams, owners));
  }
  scroller.appendChild(renderThirdPlace(matches, teams, owners));
  section.appendChild(scroller);

  wireTabs(tabs, scroller);
  return section;
}

function renderMirrorRound({ key, label, expected }, allMatches, teams, owners) {
  const section = document.createElement('section');
  section.className = 'br-round';
  section.dataset.round = key;

  const real = allMatches
    .filter((m) => m.stage === key)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
  const cellHtmls = [];
  for (let i = 0; i < expected; i++) {
    cellHtmls.push(i < real.length
      ? cellHtml(real[i], teams, owners)
      : placeholderCellHtml());
  }

  if (key === 'final') {
    section.innerHTML = `
      <div class="br-side br-side-mid">
        <div class="br-round-label">${escape(label)}</div>
        <div class="br-cells">${cellHtmls[0]}</div>
      </div>
    `;
    return section;
  }

  const half = expected / 2;
  const left = cellHtmls.slice(0, half).join('');
  const right = cellHtmls.slice(half).join('');

  section.innerHTML = `
    <div class="br-side br-side-left">
      <div class="br-round-label">${escape(label)}</div>
      <div class="br-cells">${left}</div>
    </div>
    <div class="br-side br-side-right">
      <div class="br-round-label">${escape(label)}</div>
      <div class="br-cells">${right}</div>
    </div>
  `;
  return section;
}

function renderThirdPlace(allMatches, teams, owners) {
  const section = document.createElement('section');
  section.className = 'br-round br-third';
  section.dataset.round = 'third';

  const m = allMatches.find((x) => x.stage === 'third');
  const inner = m ? cellHtml(m, teams, owners) : placeholderCellHtml();
  section.innerHTML = `
    <div class="br-side br-side-mid">
      <div class="br-round-label">3rd Place</div>
      <div class="br-cells">${inner}</div>
    </div>
  `;
  return section;
}

function cellHtml(m, teams, owners) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(owners, m.home);
  const awayOwner = ownerForTeam(owners, m.away);

  const finished = m.status === 'finished';
  const homeLost = finished && m.homeScore < m.awayScore;
  const awayLost = finished && m.awayScore < m.homeScore;

  const homeScore = m.homeScore ?? '';
  const awayScore = m.awayScore ?? '';
  const when = finished
    ? `${formatMatchDateTime(m.kickoff)} · finished`
    : (m.kickoff ? formatMatchDateTime(m.kickoff) : 'TBD');

  return `
  <div class="br-cell">
    <div class="br-team${homeLost ? ' lost' : ''}" data-full="${escape(home?.name ?? m.home ?? 'TBD')}" title="${escape(home?.name ?? m.home ?? 'TBD')}">
      <span class="pn-sticker"><span class="flag">${flag(home)}</span><span class="code">${escape(m.home ?? '?')}</span></span>
      ${ownerTag(homeOwner)}
      <span class="br-sc">${escape(String(homeScore))}</span>
    </div>
    <div class="br-team${awayLost ? ' lost' : ''}" data-full="${escape(away?.name ?? m.away ?? 'TBD')}" title="${escape(away?.name ?? m.away ?? 'TBD')}">
      <span class="pn-sticker"><span class="flag">${flag(away)}</span><span class="code">${escape(m.away ?? '?')}</span></span>
      ${ownerTag(awayOwner)}
      <span class="br-sc">${escape(String(awayScore))}</span>
    </div>
    <div class="br-when">${when}</div>
  </div>
`;
}

function placeholderCellHtml() {
  return `
    <div class="br-cell br-cell-tbd">
      <div class="br-team br-team-tbd">
        <span class="pn-sticker out"></span>
        <span class="br-name">TBD</span>
      </div>
      <div class="br-team br-team-tbd">
        <span class="pn-sticker out"></span>
        <span class="br-name">TBD</span>
      </div>
    </div>
  `;
}

function wireTabs(tabs, scroller) {
  const buttons = [...tabs.querySelectorAll('.br-tab')];
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = scroller.querySelector(`.br-round[data-round="${btn.dataset.target}"]`);
      target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
  });

  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const round = visible.target.dataset.round;
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.target === round));
  }, { root: scroller, threshold: 0.6 });

  for (const round of scroller.querySelectorAll('.br-round')) io.observe(round);
}
