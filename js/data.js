const SOURCES = {
  teams:   'data/teams.json',
  owners:  'data/owners.json',
  results: 'data/results.json',
};

const FIXTURE_NAMES = new Set(['group-mid', 'group-full', 'knockouts-r32', 'knockouts-r16']);

export const fixtureMode = detectFixtureMode();

function detectFixtureMode() {
  if (typeof window === 'undefined' || !window.location) return null;
  const param = new URLSearchParams(window.location.search).get('fixture');
  return FIXTURE_NAMES.has(param) ? param : null;
}

async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`);
  return res.json();
}

export async function loadAll() {
  const resultsUrl = fixtureMode
    ? `data/fixtures/${fixtureMode}.json`
    : SOURCES.results;

  const [teams, owners, results] = await Promise.all([
    loadJson(SOURCES.teams),
    loadJson(SOURCES.owners).catch(() => ({ drawCompletedAt: null, owners: [] })),
    loadJson(resultsUrl).catch(() => ({ lastUpdated: null, matches: [] })),
  ]);
  return { teams, owners, results };
}

export function teamByCode(teams, code) {
  return teams.find((t) => t.code === code);
}

export function ownerForTeam(owners, code) {
  if (!owners?.owners) return null;
  return owners.owners.find((o) => o.teams?.includes(code))?.name ?? null;
}
