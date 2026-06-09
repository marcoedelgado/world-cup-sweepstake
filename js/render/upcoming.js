import { formatMatchDateTime } from '../tz.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, ownerTag, flag, teamLabel } from '../utils.js';

const MAX_UPCOMING = 6;

export function renderUpcoming(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const upcoming = (results.matches ?? [])
    .filter((m) => m.status === 'scheduled' && m.kickoff > nowIso)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .slice(0, MAX_UPCOMING);

  if (!upcoming.length) return;

  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>Up Next</h3>`;

  const list = document.createElement('div');
  list.className = 'pn-results';
  for (const m of upcoming) list.appendChild(upcomingCard(m, teams, owners, nowIso));
  section.appendChild(list);
  container.appendChild(section);
}

function upcomingCard(m, teams, owners, nowIso) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const el = document.createElement('div');
  el.className = 'pn-match upcoming';
  el.innerHTML = `
    <span class="home">${teamLabel(home, m.home)}${ownerTag(ownerForTeam(owners, m.home))}</span>
    <span class="sc">${formatMatchDateTime(m.kickoff, nowIso)}</span>
    <span class="away">${ownerTag(ownerForTeam(owners, m.away))}${teamLabel(away, m.away)}</span>
  `;
  return el;
}
