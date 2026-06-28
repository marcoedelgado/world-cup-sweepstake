#!/usr/bin/env node
// Fetches WC matches from football-data.org and writes data/results.json.
// Environment:
//   FOOTBALL_API_KEY  required (X-Auth-Token header)
//   API_URL           optional override (defaults to the WC competition endpoint)

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const URL_DEFAULT = 'https://api.football-data.org/v4/competitions/WC/matches';
const OUT_PATH = path.resolve('data/results.json');
const TEAMS_PATH = path.resolve('data/teams.json');

const STAGE_MAP = {
  GROUP_STAGE: 'group',
  LAST_32: 'r32',
  ROUND_OF_32: 'r32',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};

const unknownStages = new Set();
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
  const remaining = res.headers.get('x-requests-available-minute');
  const reset = res.headers.get('x-requestcounter-reset');
  if (remaining || reset) {
    console.error(`rate-limit: ${remaining ?? '?'} req remaining this minute (reset in ${reset ?? '?'}s)`);
  }
  if (!res.ok) {
    console.error(`api error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const json = await res.json();
  const matches = (json.matches ?? []).map(toMatch).filter(Boolean);
  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  if (unknownStages.size > 0) {
    console.error(`::warning::Unrecognised API stage(s) fell back to 'group': ${[...unknownStages].join(', ')}. Add to STAGE_MAP in scripts/fetch-results.mjs.`);
  }

  await warnIfOrphanCodes(matches);

  // Compare match data (not lastUpdated) so we don't commit every run.
  let prevMatches = [];
  try {
    const prev = JSON.parse(await readFile(OUT_PATH, 'utf8'));
    prevMatches = prev.matches ?? [];
  } catch {}

  // Safeguard: refuse to overwrite populated data with an empty array. A 0-match
  // response from the API almost always means a transient hiccup (rate limit,
  // empty competition slug, transient outage) — keep the last good snapshot.
  if (matches.length === 0 && prevMatches.length > 0) {
    console.error(`::warning::API returned 0 matches but previous snapshot had ${prevMatches.length}. Refusing to overwrite.`);
    process.exit(1);
  }

  const prevMatchesJson = JSON.stringify(prevMatches);
  if (prevMatchesJson === JSON.stringify(matches)) {
    console.log('no changes');
    return;
  }

  const out = { lastUpdated: new Date().toISOString(), matches };
  await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${matches.length} matches to ${OUT_PATH}`);
}

// football-data.org occasionally returns TLAs that differ from the codes in
// teams.json — sometimes inconsistently across calls. Normalise here so
// home/away always resolve to a known team.
const TLA_REMAP = {
  URY: 'URU', // Uruguay (FIFA / our teams.json uses URU)
  CUR: 'CUW', // Curaçao (API flip-flops between CUR and CUW; teams.json uses CUW)
};

function toMatch(m) {
  const home = remap(m.homeTeam?.tla);
  const away = remap(m.awayTeam?.tla);
  if (!home || !away) return null;
  const mappedStage = STAGE_MAP[m.stage];
  if (mappedStage === undefined && m.stage) unknownStages.add(m.stage);
  return {
    id: String(m.id),
    kickoff: m.utcDate,
    stage: mappedStage ?? 'group',
    group: m.group ? m.group.replace('GROUP_', '') : null,
    home,
    away,
    status: STATUS_MAP[m.status] ?? 'scheduled',
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  };
}

function remap(tla) {
  if (!tla) return null;
  return TLA_REMAP[tla] ?? tla;
}

// Surface codes that the API returned but aren't in teams.json — they would
// render as orphan teams on the dashboard. Logged loud and clear, but does
// not fail the run; the data still ships so other matches keep working.
async function warnIfOrphanCodes(matches) {
  try {
    const teams = JSON.parse(await readFile(TEAMS_PATH, 'utf8'));
    const known = new Set(teams.map((t) => t.code));
    const orphans = new Set();
    for (const m of matches) {
      if (!known.has(m.home)) orphans.add(m.home);
      if (!known.has(m.away)) orphans.add(m.away);
    }
    if (orphans.size > 0) {
      console.error(`::warning::orphan TLA(s) from API: ${[...orphans].join(', ')} — add to TLA_REMAP or teams.json`);
    }
  } catch (err) {
    console.error('orphan-code check skipped:', err.message);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
