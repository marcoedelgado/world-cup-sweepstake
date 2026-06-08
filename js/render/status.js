import { isAlive } from '../standings.js';

export function renderStatus(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const teamsAlive = teams.filter((t) => isAlive(t.code, teams, results.matches ?? [])).length;
  const leader = leadingOwner({ teams, owners, results });
  const todayCount = matchesOn(results.matches ?? [], nowIso);

  const strip = document.createElement('section');
  strip.className = 'pn-status';
  strip.innerHTML = `
    <div class="pn-stat"><div class="big">${teamsAlive}</div><div class="lbl">teams still in</div></div>
    <div class="pn-stat"><div class="big">${escape(leader ?? '—')}</div><div class="lbl">leading the album</div></div>
    <div class="pn-stat"><div class="big">${todayCount}</div><div class="lbl">matches today</div></div>
  `;
  container.appendChild(strip);
}

function leadingOwner({ teams, owners, results }) {
  if (!owners?.owners?.length) return null;
  let best = { name: null, count: -1 };
  for (const o of owners.owners) {
    const alive = (o.teams ?? []).filter((c) => isAlive(c, teams, results.matches ?? [])).length;
    if (alive > best.count) best = { name: o.name, count: alive };
  }
  return best.name;
}

function matchesOn(matches, nowIso) {
  const day = (iso) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date(iso));
  const today = day(nowIso);
  return matches.filter((m) => day(m.kickoff) === today).length;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
