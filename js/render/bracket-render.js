import { teamByCode, ownerForTeam } from '../data.js';
import { formatMatchDateTime } from '../tz.js';
import { escape, ownerTag, flag } from '../utils.js';

const ROUNDS = [
  { key: 'r32',   label: 'Round of 32' },
  { key: 'r16',   label: 'Round of 16' },
  { key: 'qf',    label: 'Quarter-Finals' },
  { key: 'sf',    label: 'Semi-Finals' },
  { key: 'final', label: 'Final' },
];

export function renderBracket(container, { teams, owners, results }) {
  const matches = results?.matches ?? [];
  const ownersList = owners?.owners ?? [];

  // Tabs (visible only on mobile via CSS)
  const tabs = document.createElement('div');
  tabs.className = 'br-tabs';
  tabs.innerHTML = ROUNDS.map((r, i) =>
    `<button type="button" class="br-tab${i === 0 ? ' active' : ''}" data-target="${r.key}">${escape(r.label.split(' ').pop())}</button>`
  ).join('') + `<button type="button" class="br-tab" data-target="third">3rd</button>`;
  container.appendChild(tabs);

  // Scroll-snap container (becomes a swipeable carousel on mobile via CSS)
  const scroller = document.createElement('div');
  scroller.className = 'br-scroll';

  for (const r of ROUNDS) {
    scroller.appendChild(renderRound(r, matches, teams, ownersList));
  }
  scroller.appendChild(renderThirdPlace(matches, teams, ownersList));

  container.appendChild(scroller);

  wireTabs(tabs, scroller);
}

function renderRound({ key, label }, allMatches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'br-round';
  section.dataset.round = key;

  const cells = allMatches
    .filter((m) => m.stage === key)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));

  section.innerHTML = `
    <div class="br-round-label">${escape(label)}</div>
    <div class="br-cells">
      ${cells.length === 0
        ? '<div class="br-empty">TBD</div>'
        : cells.map((m) => cellHtml(m, teams, ownersList)).join('')}
    </div>
  `;
  return section;
}

function renderThirdPlace(allMatches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'br-round br-third';
  section.dataset.round = 'third';

  const m = allMatches.find((x) => x.stage === 'third');
  section.innerHTML = `
    <div class="br-round-label">3rd place</div>
    <div class="br-cells">
      ${m ? cellHtml(m, teams, ownersList) : '<div class="br-empty">TBD</div>'}
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
