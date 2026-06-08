#!/usr/bin/env node
// Fetches WC matches from football-data.org and writes data/results.json.
// Environment:
//   FOOTBALL_API_KEY  required (X-Auth-Token header)
//   API_URL           optional override (defaults to the WC competition endpoint)

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const URL_DEFAULT = 'https://api.football-data.org/v4/competitions/WC/matches';
const OUT_PATH = path.resolve('data/results.json');

const STAGE_MAP = {
  GROUP_STAGE: 'group',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};
const STATUS_MAP = {
  SCHEDULED: 'scheduled',
  TIMED:     'scheduled',
  IN_PLAY:   'live',
  PAUSED:    'live',
  LIVE:      'live',
  FINISHED:  'finished',
  POSTPONED: 'scheduled',
};

async function main() {
  const token = process.env.FOOTBALL_API_KEY;
  if (!token) {
    console.error('FOOTBALL_API_KEY is required');
    process.exit(2);
  }
  const url = process.env.API_URL || URL_DEFAULT;

  const res = await fetch(url, { headers: { 'X-Auth-Token': token } });
  if (!res.ok) {
    console.error(`api error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const json = await res.json();
  const matches = (json.matches ?? []).map(toMatch).filter(Boolean);
  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  // Compare match data (not lastUpdated) so we don't commit every run.
  let prevMatchesJson = '';
  try {
    const prev = JSON.parse(await readFile(OUT_PATH, 'utf8'));
    prevMatchesJson = JSON.stringify(prev.matches ?? []);
  } catch {}
  if (prevMatchesJson === JSON.stringify(matches)) {
    console.log('no changes');
    return;
  }

  const out = { lastUpdated: new Date().toISOString(), matches };
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${matches.length} matches to ${OUT_PATH}`);
}

function toMatch(m) {
  const home = m.homeTeam?.tla;
  const away = m.awayTeam?.tla;
  if (!home || !away) return null;
  return {
    id: String(m.id),
    kickoff: m.utcDate,
    stage: STAGE_MAP[m.stage] ?? 'group',
    group: m.group ? m.group.replace('GROUP_', '') : null,
    home,
    away,
    status: STATUS_MAP[m.status] ?? 'scheduled',
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  };
}

main().catch((err) => { console.error(err); process.exit(1); });
