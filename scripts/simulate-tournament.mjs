#!/usr/bin/env node
// Simulate a tournament state into data/results.json for local preview/testing.
//
// Usage:
//   node scripts/simulate-tournament.mjs                     # default: group-mid
//   node scripts/simulate-tournament.mjs --phase=group-mid   # matchdays 1+2 finished, 1 live, rest scheduled
//   node scripts/simulate-tournament.mjs --phase=group-full  # all 72 group matches finished (triggers knockout phase)
//   node scripts/simulate-tournament.mjs --seed=99           # different deterministic scoreline distribution
//
// Revert after preview:  git checkout data/results.json
//
// The script is deterministic for a given --seed; same seed produces the same scorelines.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RESULTS_PATH = path.resolve('data/results.json');
const VALID_PHASES = new Set(['group-mid', 'group-full']);

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

// Reset every group-stage match to a known starting state, then re-apply scores per phase.
for (const m of matches) {
  if (m.stage !== 'group') continue;
  m.status = 'scheduled';
  m.homeScore = null;
  m.awayScore = null;
}

const groups = new Map();
for (const m of matches) {
  if (m.stage !== 'group') continue;
  if (!groups.has(m.group)) groups.set(m.group, []);
  groups.get(m.group).push(m);
}
for (const arr of groups.values()) arr.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

const finishedPerGroup = phase === 'group-full' ? 6 : 4;
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

matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
data.lastUpdated = phase === 'group-full' ? '2026-06-28T22:00:00Z' : '2026-06-22T16:00:00Z';

await writeFile(RESULTS_PATH, JSON.stringify(data, null, 2) + '\n');

const counts = matches.reduce((acc, m) => {
  acc[m.status] = (acc[m.status] ?? 0) + 1;
  return acc;
}, {});
console.log(`wrote ${matches.length} matches to ${RESULTS_PATH}`);
console.log(`phase=${phase}  seed=${seed}  status:`, counts);
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
