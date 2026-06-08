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

export function renderBracket(container, { teams, owners, results }) {
  const matches = results?.matches ?? [];
  const ownersList = owners?.owners ?? [];

  const r32 = matches.filter((m) => m.stage === 'r32');
  const r32Complete = r32.length === 16 && r32.every((m) => m.status === 'finished');

  const r32Section = renderR32Section(matches, teams, ownersList);
  const knockoutsSection = renderKnockoutsSection(matches, teams, ownersList);

  // Once R32 is fully played, surface the knockouts mirror at the top
  // and demote the (now historical) R32 list to below.
  if (r32Complete) {
    container.appendChild(knockoutsSection);
    container.appendChild(r32Section);
  } else {
    container.appendChild(r32Section);
    container.appendChild(knockoutsSection);
  }
}

function renderR32Section(matches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'pn-section br-r32-section';

  const real = matches
    .filter((m) => m.stage === 'r32')
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
  const cells = [];
  for (let i = 0; i < 16; i++) {
    cells.push(i < real.length
      ? cellHtml(real[i], teams, ownersList)
      : placeholderCellHtml());
  }
  section.innerHTML = `
    <h3>Round of 32</h3>
    <div class="br-r32-grid">${cells.join('')}</div>
  `;
  return section;
}

function renderKnockoutsSection(matches, teams, ownersList) {
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
    scroller.appendChild(renderMirrorRound(r, matches, teams, ownersList));
  }
  scroller.appendChild(renderThirdPlace(matches, teams, ownersList));
  section.appendChild(scroller);

  wireTabs(tabs, scroller);
  return section;
}

function renderMirrorRound({ key, label, expected }, allMatches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'br-round';
  section.dataset.round = key;

  const real = allMatches
    .filter((m) => m.stage === key)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));
  const cellHtmls = [];
  for (let i = 0; i < expected; i++) {
    cellHtmls.push(i < real.length
      ? cellHtml(real[i], teams, ownersList)
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

function renderThirdPlace(allMatches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'br-round br-third';
  section.dataset.round = 'third';

  const m = allMatches.find((x) => x.stage === 'third');
  const inner = m ? cellHtml(m, teams, ownersList) : placeholderCellHtml();
  section.innerHTML = `
    <div class="br-side br-side-mid">
      <div class="br-round-label">3rd Place</div>
      <div class="br-cells">${inner}</div>
    </div>
  `;
  return section;
}

function cellHtml(m, teams, ownersList) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(ownersList, m.home);
  const awayOwner = ownerForTeam(ownersList, m.away);

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
      <div class="br-team${homeLost ? ' lost' : ''}">
        <span class="pn-sticker"><span class="flag">${flag(home)}</span><span class="code">${escape(m.home ?? '?')}</span></span>
        <span class="br-name">${escape(home?.name ?? m.home ?? 'TBD')}</span>
        ${ownerTag(homeOwner)}
        <span class="br-sc">${escape(String(homeScore))}</span>
      </div>
      <div class="br-team${awayLost ? ' lost' : ''}">
        <span class="pn-sticker"><span class="flag">${flag(away)}</span><span class="code">${escape(m.away ?? '?')}</span></span>
        <span class="br-name">${escape(away?.name ?? m.away ?? 'TBD')}</span>
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
