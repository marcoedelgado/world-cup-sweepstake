import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { formatMatchDateTime } from '../tz.js';
import { escape, flag } from '../utils.js';

const KNOCKOUT_LABEL = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final' };

export function renderOwnerDetail(container, { teams, results }, owner) {
  const matches = results?.matches ?? [];

  const teamRows = (owner.teams ?? []).map((code) => ({
    code,
    team: teamByCode(teams, code),
    alive: isAlive(code, teams, matches),
    record: computeRecord(code, matches),
    next: nextFixture(code, matches, teams),
  }));

  teamRows.sort((a, b) => Number(b.alive) - Number(a.alive));
  const aliveCount = teamRows.filter((r) => r.alive).length;

  const cover = document.createElement('section');
  cover.className = 'pn-cover';
  cover.innerHTML = `
    <p class="back-link"><a href="index.html">← Back to the album</a></p>
    <h1 class="pn-title">${escape(owner.name)}</h1>
    <div class="pn-subtitle">${aliveCount} of ${teamRows.length} alive</div>
  `;
  container.appendChild(cover);

  const list = document.createElement('section');
  list.className = 'pn-section owner-team-list';
  list.innerHTML = teamRows.map(rowHtml).join('');
  container.appendChild(list);
}

function rowHtml({ code, team, alive, record, next }) {
  const cls = alive ? 'owner-team-row' : 'owner-team-row out';
  const stickerCls = alive ? 'pn-sticker' : 'pn-sticker out';
  const name = team?.name ?? code;
  const flagChar = flag(team);
  return `
    <div class="${cls}">
      <span class="${stickerCls}"><span class="flag">${flagChar}</span><span class="code">${escape(code)}</span></span>
      <span class="t-name">${escape(name)}</span>
      <span class="t-rec">${record.w}W ${record.d}D ${record.l}L · ${formatGd(record.gd)} GD</span>
      <span class="t-next">${next}</span>
    </div>
  `;
}

function computeRecord(teamCode, matches) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    if (m.home !== teamCode && m.away !== teamCode) continue;
    const isHome = m.home === teamCode;
    const my = isHome ? m.homeScore : m.awayScore;
    const opp = isHome ? m.awayScore : m.homeScore;
    gf += my; ga += opp;
    if (my > opp) w += 1;
    else if (my < opp) l += 1;
    else d += 1;
  }
  return { w, d, l, gd: gf - ga };
}

function nextFixture(teamCode, matches, teams) {
  const upcoming = matches
    .filter((m) => m.status !== 'finished')
    .filter((m) => m.home === teamCode || m.away === teamCode)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));

  if (upcoming.length === 0) {
    const playedAny = matches.some((m) =>
      m.status === 'finished' && (m.home === teamCode || m.away === teamCode));
    return playedAny ? 'eliminated' : 'awaiting fixtures';
  }

  const next = upcoming[0];
  const oppCode = next.home === teamCode ? next.away : next.home;
  const oppTeam = teamByCode(teams, oppCode);
  const oppLabel = oppTeam?.code ?? oppCode;
  const stageLabel = next.stage === 'group' ? `Group ${escape(next.group ?? '?')}` : (KNOCKOUT_LABEL[next.stage] ?? next.stage);
  return `→ vs ${escape(oppLabel)} · ${stageLabel} · ${formatMatchDateTime(next.kickoff)}`;
}

function formatGd(gd) {
  if (gd > 0) return `+${gd}`;
  if (gd < 0) return `−${Math.abs(gd)}`;
  return '0';
}
