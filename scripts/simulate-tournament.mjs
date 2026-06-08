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
// For committed snapshots (data/fixtures/*.json), use scripts/generate-fixtures.mjs.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyPhase, VALID_PHASES } from './fixture-builder.mjs';

const RESULTS_PATH = path.resolve('data/results.json');
const TEAMS_PATH = path.resolve('data/teams.json');

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
const teams = JSON.parse(await readFile(TEAMS_PATH, 'utf8'));
const matches = data.matches ?? [];

data.lastUpdated = applyPhase(matches, phase, { seed, teams });

await writeFile(RESULTS_PATH, JSON.stringify(data, null, 2) + '\n');

const counts = matches.reduce((acc, m) => {
  const key = `${m.stage}/${m.status}`;
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
console.log(`wrote ${matches.length} matches to ${RESULTS_PATH}`);
console.log(`phase=${phase}  seed=${seed}  counts:`, counts);
console.log(`revert with:  git checkout data/results.json`);
