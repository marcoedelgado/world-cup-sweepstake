import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { tournamentPhase } from '../phase.js';
import { escape, flag } from '../utils.js';

const MATCHDAY_SIZE = 24; // 12 groups × 2 matches per matchday
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function renderStatus(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const matches = results?.matches ?? [];

  const strip = document.createElement('section');
  strip.className = 'pn-status';
  strip.innerHTML = `
    ${phaseTile(matches, teams, nowIso)}
    ${latestResultTile(matches, teams)}
    ${thisWeekTile(matches, nowIso)}
  `;
  container.appendChild(strip);
}

function phaseTile(matches, teams, nowIso) {
  const phase = tournamentPhase(matches);

  if (phase === 'knockout') {
    const alive = teams.filter((t) => isAlive(t.code, teams, matches)).length;
    return tile(String(alive), 'teams still in');
  }

  const finished = matches.filter((m) => m.stage === 'group' && m.status === 'finished').length;
  if (finished === 0) {
    const firstGroup = matches
      .filter((m) => m.stage === 'group')
      .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''))[0];
    if (firstGroup?.kickoff && Date.parse(firstGroup.kickoff) > Date.parse(nowIso)) {
      const days = daysBetween(nowIso, firstGroup.kickoff);
      return tile(String(days), days === 1 ? 'day to kickoff' : 'days to kickoff');
    }
  }
  const matchday = Math.min(3, 1 + Math.floor(finished / MATCHDAY_SIZE));
  return tile(`MD ${matchday}`, 'group stage');
}

function latestResultTile(matches, teams) {
  const latest = matches
    .filter((m) => m.status === 'finished')
    .sort((a, b) => (b.kickoff ?? '').localeCompare(a.kickoff ?? ''))[0];

  if (!latest) return tile('—', 'no results yet');

  const home = teamByCode(teams, latest.home);
  const away = teamByCode(teams, latest.away);
  const inner = `<span class="latest-flag">${flag(home)}</span> <span class="latest-sc">${escape(`${latest.homeScore}-${latest.awayScore}`)}</span> <span class="latest-flag">${flag(away)}</span>`;
  return `<div class="pn-stat pn-stat-latest"><div class="big">${inner}</div><div class="lbl">latest result</div></div>`;
}

function thisWeekTile(matches, nowIso) {
  const now = new Date(nowIso);
  const dayOfWeek = now.getUTCDay(); // 0 (Sun) – 6 (Sat)
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const nextMonday = monday.getTime() + WEEK_MS;

  const count = matches.filter((m) => {
    if (!m.kickoff) return false;
    const k = Date.parse(m.kickoff);
    return k >= monday.getTime() && k < nextMonday;
  }).length;

  return tile(String(count), 'this week');
}

function tile(big, lbl) {
  return `<div class="pn-stat"><div class="big">${escape(big)}</div><div class="lbl">${escape(lbl)}</div></div>`;
}

function daysBetween(fromIso, toIso) {
  const day = (iso) => Math.floor(Date.parse(iso) / 86_400_000);
  return Math.max(0, day(toIso) - day(fromIso));
}
