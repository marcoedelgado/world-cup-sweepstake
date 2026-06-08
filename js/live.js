const TIMEOUT_MS = 3000;
const PROVIDER_URL = 'https://api.football-data.org/v4/competitions/WC/matches?status=LIVE,IN_PLAY,PAUSED';

export async function fetchLiveMatches() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(PROVIDER_URL, { signal: controller.signal });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.matches ?? []).map(normalise);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function normalise(m) {
  return {
    id: String(m.id),
    home: m.homeTeam?.tla,
    away: m.awayTeam?.tla,
    homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? 0,
    awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? 0,
    status: 'live',
  };
}

export function mergeLive(staticMatches, liveMatches) {
  const overlay = new Map(liveMatches.map((m) => [`${m.home}-${m.away}`, m]));
  return staticMatches.map((m) => {
    const live = overlay.get(`${m.home}-${m.away}`);
    return live
      ? { ...m, status: 'live', homeScore: live.homeScore, awayScore: live.awayScore, live: true }
      : m;
  });
}
