import { formatMatchDateTime } from '../tz.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, ownerTag, flag, teamLabel } from '../utils.js';

const MAX_LATEST = 6;

export function renderLatestResults(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const finished = (results.matches ?? [])
    .filter((m) => m.status === 'finished' && m.homeScore != null && m.awayScore != null)
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, MAX_LATEST);

  if (!finished.length) return; // first kickoff hasn't happened yet

  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>Latest Results</h3>`;

  const list = document.createElement('div');
  list.className = 'pn-results';
  for (const m of finished) list.appendChild(matchCard(m, teams, owners, nowIso));
  section.appendChild(list);
  container.appendChild(section);
}

function matchCard(m, teams, owners, nowIso) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(owners, m.home);
  const awayOwner = ownerForTeam(owners, m.away);

  const el = document.createElement('div');
  el.className = 'pn-match';
  el.innerHTML = `
    <span class="home">${teamLabel(home, m.home)}${ownerTag(homeOwner)}</span>
    <span class="score-col">
      <span class="sc">${m.homeScore} – ${m.awayScore}</span>
      <span class="when">${formatMatchDateTime(m.kickoff, nowIso)}</span>
    </span>
    <span class="away">${ownerTag(awayOwner)}${teamLabel(away, m.away)}</span>
  `;
  return el;
}
