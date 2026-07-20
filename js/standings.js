const KNOCKOUT_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'final', 'third']);

function emptyRow(code) {
  return { code, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

export function computeStandings(groupCode, teams, matches) {
  const rows = new Map(
    teams.filter((t) => t.group === groupCode).map((t) => [t.code, emptyRow(t.code)])
  );
  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.group === groupCode && m.status === 'finished'
  );

  for (const m of groupMatches) {
    const home = rows.get(m.home);
    const away = rows.get(m.away);
    if (!home || !away) continue;

    home.played += 1; away.played += 1;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;

    if (m.homeScore > m.awayScore)       { home.won += 1;   home.points += 3; away.lost += 1; }
    else if (m.homeScore < m.awayScore)  { away.won += 1;   away.points += 3; home.lost += 1; }
    else                                  { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
  }

  for (const r of rows.values()) r.gd = r.gf - r.ga;

  const table = [...rows.values()];
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.code.localeCompare(b.code); // stable, deterministic
  });
  return table;
}

export function isAlive(teamCode, teams, matches) {
  const team = teams.find((t) => t.code === teamCode);
  if (!team) return false;

  // Knockout: any finished knockout match where this team lost → eliminated.
  for (const m of matches) {
    if (!KNOCKOUT_STAGES.has(m.stage)) continue;
    if (m.status !== 'finished') continue;
    if (m.home === teamCode && m.homeScore < m.awayScore) return false;
    if (m.away === teamCode && m.awayScore < m.homeScore) return false;
  }

  // If R32 fixtures exist, they're authoritative for knockout participation.
  // A team is alive iff it appears in an R32 fixture (and hasn't lost above).
  const r32Fixtures = matches.filter((m) => m.stage === 'r32');
  if (r32Fixtures.length > 0) {
    return r32Fixtures.some((m) => m.home === teamCode || m.away === teamCode);
  }

  // No R32 fixtures yet — fall back to group-stage progression rules.
  const groupFinished = matches.filter(
    (m) => m.stage === 'group' && m.group === team.group && m.status === 'finished'
  );
  const teamMatchesPlayed = groupFinished.filter((m) => m.home === teamCode || m.away === teamCode).length;
  if (teamMatchesPlayed < 3) return true;

  const table = computeStandings(team.group, teams, matches);
  const rank = table.findIndex((r) => r.code === teamCode);
  return rank < 2; // top 2 approximation — only used in the brief window before R32 fixtures land
}

export function getWinner(matches) {
  const final = matches.find((m) => m.stage === 'final' && m.status === 'finished');
  if (!final) return null;
  if (final.homeScore === final.awayScore) return null;
  const teamCode = final.homeScore > final.awayScore ? final.home : final.away;
  return { teamCode };
}
