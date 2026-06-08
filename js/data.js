const SOURCES = {
  teams:   'data/teams.json',
  owners:  'data/owners.json',
  results: 'data/results.json',
};

async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`);
  return res.json();
}

export async function loadAll() {
  const [teams, owners, results] = await Promise.all([
    loadJson(SOURCES.teams),
    loadJson(SOURCES.owners).catch(() => ({ drawCompletedAt: null, owners: [] })),
    loadJson(SOURCES.results).catch(() => ({ lastUpdated: null, matches: [] })),
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
