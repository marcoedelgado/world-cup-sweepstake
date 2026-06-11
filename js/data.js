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

export function withFixture(href) {
  if (!fixtureMode) return href;
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}fixture=${fixtureMode}`;
}

async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`);
  return res.json();
}

function resultsUrl() {
  return fixtureMode ? `data/fixtures/${fixtureMode}.json` : SOURCES.results;
}

export async function loadAll() {
  const ownersUrl = fixtureMode
    ? 'data/fixtures/owners.json'
    : SOURCES.owners;

  const [teams, owners, results] = await Promise.all([
    loadJson(SOURCES.teams),
    loadJson(ownersUrl).catch(() => ({ drawCompletedAt: null, owners: [] })),
    loadJson(resultsUrl()).catch(() => ({ lastUpdated: null, matches: [] })),
  ]);
  return { teams, owners, results };
}

export async function reloadResults() {
  return loadJson(resultsUrl());
}

export function teamByCode(teams, code) {
  return teams.find((t) => t.code === code);
}

export function ownerForTeam(owners, code) {
  if (!owners?.owners) return null;
  return owners.owners.find((o) => o.teams?.includes(code))?.name ?? null;
}
