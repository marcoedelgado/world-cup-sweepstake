#!/usr/bin/env node
// Generate committed fixture snapshots used by ?fixture=<phase> preview mode.
//
// For each phase in fixture-builder's VALID_PHASES, write data/fixtures/<phase>.json
// (deterministic, seeded). Safe to re-run; files are always overwritten.
//
// Usage:
//   node scripts/generate-fixtures.mjs
//
// Re-run whenever fixture-builder's phase logic changes.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { applyPhase, VALID_PHASES } from './fixture-builder.mjs';

const RESULTS_PATH = path.resolve('data/results.json');
const TEAMS_PATH = path.resolve('data/teams.json');
const FIXTURE_DIR = path.resolve('data/fixtures');
const SEED = 42;

await mkdir(FIXTURE_DIR, { recursive: true });

const baseData = JSON.parse(await readFile(RESULTS_PATH, 'utf8'));
const teams = JSON.parse(await readFile(TEAMS_PATH, 'utf8'));

for (const phase of VALID_PHASES) {
  // Deep-clone matches so each phase starts from the same pristine schedule.
  const matches = JSON.parse(JSON.stringify(baseData.matches ?? []));
  const lastUpdated = applyPhase(matches, phase, { seed: SEED, teams });
  const out = { lastUpdated, matches };
  const outPath = path.join(FIXTURE_DIR, `${phase}.json`);
  await writeFile(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${phase} → ${path.relative(process.cwd(), outPath)}  (${matches.length} matches)`);
}
