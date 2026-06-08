// Library: applies a named "phase" to a matches array in-place and returns the
// appropriate `lastUpdated` ISO. Shared by simulate-tournament.mjs (writes to
// data/results.json) and generate-fixtures.mjs (writes to data/fixtures/*.json).
//
// Deterministic for a given seed: same seed always produces identical scores
// and pairings.

import { computeStandings } from '../js/standings.js';

export const VALID_PHASES = new Set(['group-mid', 'group-full', 'knockouts-r32', 'knockouts-r16']);

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const R32_START_ISO = '2026-06-28T16:00:00Z';
const R16_START_ISO = '2026-07-02T16:00:00Z';
const KO_SPACING_MS = 6 * 60 * 60 * 1000;

// Group matches can draw. Distribution skewed toward common World Cup scores.
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

// Knockout matches don't end level in normal time.
const KO_SCORE_POOL = [
  [1, 0], [0, 1], [2, 0], [0, 2], [2, 1], [1, 2],
  [3, 0], [0, 3], [3, 1], [1, 3], [3, 2], [2, 3],
  [4, 1], [1, 4],
];

const LAST_UPDATED = {
  'group-mid':     '2026-06-22T16:00:00Z',
  'group-full':    '2026-06-28T22:00:00Z',
  'knockouts-r32': '2026-06-29T12:00:00Z',
  'knockouts-r16': '2026-07-02T08:00:00Z',
};

/**
 * Mutate `matches` to represent the given phase. Returns the matching
 * `lastUpdated` ISO that the caller should write alongside.
 *
 * Steps:
 *   1. Drop any non-group matches and reset every group match to scheduled.
 *   2. Finish the first N matchdays per group (4 or 6 depending on phase).
 *   3. For group-mid: flip the next match to live with a partial score.
 *   4. For knockouts-r32/r16: compute qualifiers, generate R32 fixtures.
 *   5. For knockouts-r16: finish each R32, generate R16 fixtures from winners.
 */
export function applyPhase(matches, phase, { seed, teams }) {
  if (!VALID_PHASES.has(phase)) {
    throw new Error(`unknown phase: ${phase}. valid: ${[...VALID_PHASES].join(', ')}`);
  }
  const rng = mulberry32(seed);

  // 1. Reset
  for (let i = matches.length - 1; i >= 0; i--) {
    if (matches[i].stage !== 'group') {
      matches.splice(i, 1);
    } else {
      matches[i].status = 'scheduled';
      matches[i].homeScore = null;
      matches[i].awayScore = null;
    }
  }

  // 2. Finish first N matchdays per group
  const groups = new Map();
  for (const m of matches) {
    if (!groups.has(m.group)) groups.set(m.group, []);
    groups.get(m.group).push(m);
  }
  for (const arr of groups.values()) arr.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const finishedPerGroup = phase === 'group-mid' ? 4 : 6;
  for (const ms of groups.values()) {
    for (let i = 0; i < finishedPerGroup; i++) {
      const [h, a] = pick(SCORE_POOL, rng);
      ms[i].status = 'finished';
      ms[i].homeScore = h;
      ms[i].awayScore = a;
    }
  }

  // 3. Live overlay for group-mid
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

  // 4. R32 fixtures
  if (phase === 'knockouts-r32' || phase === 'knockouts-r16') {
    const qualifiers = buildQualifiers(teams, matches);
    matches.push(...buildR32Fixtures(qualifiers, rng));
  }

  // 5. R32 finished + R16 fixtures
  if (phase === 'knockouts-r16') {
    const r32 = matches.filter((m) => m.stage === 'r32');
    for (const m of r32) {
      const [h, a] = pick(KO_SCORE_POOL, rng);
      m.status = 'finished';
      m.homeScore = h;
      m.awayScore = a;
    }
    r32.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
    matches.push(...buildR16Fixtures(r32));
  }

  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  return LAST_UPDATED[phase];
}

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

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
  thirds.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.code.localeCompare(b.code));
  return [...topTwo, ...thirds.slice(0, 8)];
}

function buildR32Fixtures(qualifiers, rng) {
  const pool = qualifiers.map((q) => q.code);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
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
