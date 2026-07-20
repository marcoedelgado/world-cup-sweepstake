import { isAlive, getWinner } from '../standings.js';
import { teamByCode, withFixture } from '../data.js';
import { formatMatchDateTime } from '../tz.js';
import { escape, flag, formatGd } from '../utils.js';

const KNOCKOUT_LABEL = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final' };

export function renderOwnerDetail(container, { teams, results }, owner) {
  const matches = results?.matches ?? [];
  const winnerResult = getWinner(matches);
  const isWinner = winnerResult !== null && (owner.teams ?? []).includes(winnerResult.teamCode);

  const teamRows = (owner.teams ?? []).map((code) => {
    const [next, nextShort] = nextFixture(code, matches, teams);
    return {
      code,
      team: teamByCode(teams, code),
      alive: isAlive(code, teams, matches),
      record: computeRecord(code, matches),
      next,
      nextShort,
    };
  });

  teamRows.sort((a, b) => Number(b.alive) - Number(a.alive));
  const aliveCount = teamRows.filter((r) => r.alive).length;

  const backLink = document.createElement('p');
  backLink.className = 'back-link';
  backLink.innerHTML = `<a href="${withFixture('index.html')}">← Back to the album</a>`;
  container.appendChild(backLink);

  const layout = document.createElement('section');
  layout.className = 'owner-layout';
  layout.innerHTML = `
    <div class="owner-list owner-team-list">${teamRows.map(rowHtml).join('')}</div>
    <aside class="owner-sticker">${renderPanini(owner, aliveCount, teamRows.length, isWinner)}</aside>
  `;
  container.appendChild(layout);
}

function renderPanini(owner, aliveCount, total, isWinner = false) {
  const photoBlock = owner.photo
    ? `<img src="${escape(owner.photo)}" alt="${escape(owner.name)}">`
    : `<div class="silhouette"></div><div class="stamp">Your<br>Photo<br>Here</div>`;
  const descBlock = owner.description
    ? `<div class="panini-desc"><p>"${escape(owner.description)}"</p></div>`
    : '';
  const aliveLabel = isWinner
    ? '🏆 WORLD CHAMPION'
    : `${aliveCount} / ${total} ALIVE`;
  const winnerClass = isWinner ? ' winner' : '';
  return `
    <div class="panini${winnerClass}">
      <div class="panini-alive">${aliveLabel}</div>
      <div class="panini-photo">${photoBlock}</div>
      <div class="panini-name">${escape(owner.name.toUpperCase())}</div>
      ${descBlock}
      <div class="panini-foot"><span class="star">★</span> WC26 SWEEPSTAKE</div>
    </div>
  `;
}

function rowHtml({ code, team, alive, record, next, nextShort }) {
  const cls = alive ? 'owner-team-row' : 'owner-team-row out';
  const stickerCls = alive ? 'pn-sticker' : 'pn-sticker out';
  const name = team?.name ?? code;
  const flagChar = flag(team);
  return `
    <div class="${cls}">
      <span class="${stickerCls}" data-full="${escape(name)}"><span class="flag">${flagChar}</span><span class="code">${escape(code)}</span></span>
      <span class="t-name" data-full="${escape(name)}">${escape(name)}</span>
      <span class="t-rec">${record.w}W ${record.d}D ${record.l}L · ${formatGd(record.gd)} GD</span>
      <span class="t-next">${next}</span>
      <span class="t-next-short">${nextShort}</span>
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
    const label = playedAny ? 'eliminated' : 'awaiting fixtures';
    return [label, label];
  }

  const next = upcoming[0];
  const oppCode = next.home === teamCode ? next.away : next.home;
  const oppTeam = teamByCode(teams, oppCode);
  const oppLabel = oppTeam?.code ?? oppCode;
  const stageLabel = next.stage === 'group' ? `Group ${escape(next.group ?? '?')}` : (KNOCKOUT_LABEL[next.stage] ?? next.stage);
  const long = `→ vs ${escape(oppLabel)} · ${stageLabel} · ${formatMatchDateTime(next.kickoff)}`;
  const short = `vs ${escape(oppLabel)}`;
  return [long, short];
}
