#!/usr/bin/env node
// Simulate a tournament state into data/results.json for local preview/testing.
//
// Usage:
//   node scripts/simulate-tournament.mjs                          # default: group-mid
//   node scripts/simulate-tournament.mjs --phase=group-mid        # matchdays 1+2 finished, 1 live, rest scheduled
//   node scripts/simulate-tournament.mjs --phase=group-full       # all 72 group matches finished (triggers knockout phase)
//   node scripts/simulate-tournament.mjs --phase=knockouts-r32    # group-full + 16 R32 fixtures with computed qualifiers
//   node scripts/simulate-tournament.mjs --phase=knockouts-r16    # knockouts-r32 + R32 finished + 8 R16 fixtures from winners
//   node scripts/simulate-tournament.mjs --seed=99                # different deterministic scoreline distribution
//
// Revert after preview:  git checkout data/results.json
//
// The script is deterministic for a given --seed; same seed produces the same scorelines and pairings.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { computeStandings } from '../js/standings.js';

const RESULTS_PATH = path.resolve('data/results.json');
const TEAMS_PATH = path.resolve('data/teams.json');
const VALID_PHASES = new Set(['group-mid', 'group-full', 'knockouts-r32', 'knockouts-r16']);
const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const R32_START_ISO = '2026-06-28T16:00:00Z';
const R16_START_ISO = '2026-07-02T16:00:00Z';
const KO_SPACING_MS = 6 * 60 * 60 * 1000; // 6h between knockout kickoffs

// Non-draw scores for knockout matches (which can't end level in normal time).
const KO_SCORE_POOL = [
  [1, 0], [0, 1], [2, 0], [0, 2], [2, 1], [1, 2],
  [3, 0], [0, 3], [3, 1], [1, 3], [3, 2], [2, 3],
  [4, 1], [1, 4],
];

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);
const phase = args.phase ?? 'group-mid';
const seed = Number(args.seed ?? 42);

if (!VALID_PHASES.has(phase)) {
  console.error(`unknown --phase=${phase}. valid: ${[...VALID_PHASES].join(', ')}`);
  process.exit(2);
}
if (!Number.isFinite(seed)) {
  console.error(`--seed must be a number`);
  process.exit(2);
}

const data = JSON.parse(await readFile(RESULTS_PATH, 'utf8'));
const matches = data.matches ?? [];
const rng = mulberry32(seed);

const SCORE_POOL = [
  [0, 0], [0, 0],
  [1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1], [1, 0], [0, 1],
  [1, 1], [1, 1], [1, 1],
  [2, 0], [0, 2], [2, 1], [1, 2],
  [2, 0], [0, 2], [2, 1], [1, 2],
  [2, 0], [0, 2], [2, 1], [1, 2],
  [2, 0], [0, 2], [2, 1], [1, 2],
  [2, 2], [2, 2],
  [3, 0], [0, 3], [3, 0], [0, 3],
  [3, 1], [1, 3], [3, 2], [2, 3],
  [4, 0], [4, 1],
];

// Reset: keep only group matches (drop any previously-simulated knockout fixtures),
// and set every group match back to scheduled / null scores.
for (let i = matches.length - 1; i >= 0; i--) {
  if (matches[i].stage !== 'group') {
    matches.splice(i, 1);
  } else {
    matches[i].status = 'scheduled';
    matches[i].homeScore = null;
    matches[i].awayScore = null;
  }
}

const groups = new Map();
for (const m of matches) {
  if (m.stage !== 'group') continue;
  if (!groups.has(m.group)) groups.set(m.group, []);
  groups.get(m.group).push(m);
}
for (const arr of groups.values()) arr.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

const finishedPerGroup = phase === 'group-mid' ? 4 : 6;
for (const ms of groups.values()) {
  for (let i = 0; i < finishedPerGroup; i++) {
    const [h, a] = pick(SCORE_POOL);
    ms[i].status = 'finished';
    ms[i].homeScore = h;
    ms[i].awayScore = a;
  }
}

// In group-mid, also flip one matchday-3 match to LIVE so the live badge renders.
if (phase === 'group-mid') {
  const liveCandidate = matches
    .filter((m) => m.stage === 'group' && m.status === 'scheduled')
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  if (liveCandidate) {
    liveCandidate.status = 'live';
    liveCandidate.homeScore = 1;
    liveCandidate.awayScore = 0;
  }
}

// knockouts-r32 / knockouts-r16: build R32 fixtures from group qualifiers.
if (phase === 'knockouts-r32' || phase === 'knockouts-r16') {
  const teams = JSON.parse(await readFile(TEAMS_PATH, 'utf8'));
  const qualifiers = buildQualifiers(teams, matches);
  const r32 = buildR32Fixtures(qualifiers, rng);
  matches.push(...r32);
}

// knockouts-r16: finish each R32 with a non-draw score, generate 8 R16 fixtures from winners.
if (phase === 'knockouts-r16') {
  const r32Matches = matches.filter((m) => m.stage === 'r32');
  for (const m of r32Matches) {
    const [h, a] = pick(KO_SCORE_POOL);
    m.status = 'finished';
    m.homeScore = h;
    m.awayScore = a;
  }
  r32Matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  matches.push(...buildR16Fixtures(r32Matches));
}

matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
data.lastUpdated =
  phase === 'knockouts-r16' ? '2026-07-02T08:00:00Z'
  : phase === 'knockouts-r32' ? '2026-06-29T12:00:00Z'
  : phase === 'group-full'  ? '2026-06-28T22:00:00Z'
  :                           '2026-06-22T16:00:00Z';

await writeFile(RESULTS_PATH, JSON.stringify(data, null, 2) + '\n');

const counts = matches.reduce((acc, m) => {
  const key = `${m.stage}/${m.status}`;
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
console.log(`wrote ${matches.length} matches to ${RESULTS_PATH}`);
console.log(`phase=${phase}  seed=${seed}  counts:`, counts);
console.log(`revert with:  git checkout data/results.json`);

function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

function mulberry32(s) {
  return function rand() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildQualifiers(teams, allMatches) {
  const topTwo = [];
  const thirds = [];
  for (const g of GROUP_CODES) {
    const table = computeStandings(g, teams, allMatches);
    if (table.length < 3) continue;
    topTwo.push(table[0], table[1]);
    thirds.push(table[2]);
  }
  // FIFA-style tiebreakers for the 8 best 3rd-placed teams.
  thirds.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.code.localeCompare(b.code));
  return [...topTwo, ...thirds.slice(0, 8)];
}

function buildR32Fixtures(qualifiers, rngFn) {
  const pool = qualifiers.map((q) => q.code);
  // Fisher–Yates shuffle, deterministic via rng.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rngFn() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const baseMs = Date.parse(R32_START_ISO);
  const fixtures = [];
  for (let i = 0; i < 16; i++) {
    fixtures.push({
      id: `sim-r32-${i + 1}`,
      kickoff: new Date(baseMs + i * KO_SPACING_MS).toISOString(),
      stage: 'r32',
      group: null,
      home: pool[i * 2],
      away: pool[i * 2 + 1],
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
    });
  }
  return fixtures;
}

function buildR16Fixtures(r32Sorted) {
  const baseMs = Date.parse(R16_START_ISO);
  const fixtures = [];
  for (let i = 0; i < 8; i++) {
    const a = r32Sorted[i * 2];
    const b = r32Sorted[i * 2 + 1];
    const aWinner = a.homeScore > a.awayScore ? a.home : a.away;
    const bWinner = b.homeScore > b.awayScore ? b.home : b.away;
    fixtures.push({
      id: `sim-r16-${i + 1}`,
      kickoff: new Date(baseMs + i * KO_SPACING_MS).toISOString(),
      stage: 'r16',
      group: null,
      home: aWinner,
      away: bWinner,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
    });
  }
  return fixtures;
}
