import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBracketTree, computeEliminated, winnersByNode, matchWinner, sortByKickoff,
} from '../js/render/radial-model.js';

function r32Match(i, home, away, status = 'scheduled', hs = null, as = null) {
  return {
    id: `m${i}`, stage: 'r32', group: null,
    kickoff: `2026-06-28T${String(i).padStart(2, '0')}:00:00Z`,
    home, away, status, homeScore: hs, awayScore: as,
  };
}

const R32 = [
  r32Match(0, 'BRA', 'JPN'), r32Match(1, 'GER', 'PAR'),
  r32Match(2, 'NED', 'MAR'), r32Match(3, 'CIV', 'NOR'),
  r32Match(4, 'FRA', 'SWE'), r32Match(5, 'MEX', 'ECU'),
  r32Match(6, 'ENG', 'COD'), r32Match(7, 'BEL', 'SEN'),
  r32Match(8, 'USA', 'BIH'), r32Match(9, 'ESP', 'AUT'),
  r32Match(10, 'POR', 'CRO'), r32Match(11, 'SUI', 'ALG'),
  r32Match(12, 'AUS', 'EGY'), r32Match(13, 'ARG', 'CPV'),
  r32Match(14, 'COL', 'GHA'), r32Match(15, 'RSA', 'CAN'),
];

test('buildBracketTree yields 32 leaves paired by match', () => {
  const { leaves } = buildBracketTree(R32);
  assert.equal(leaves.length, 32);
  assert.equal(leaves[0].code, 'BRA');
  assert.equal(leaves[0].side, 'home');
  assert.equal(leaves[1].code, 'JPN');
  assert.equal(leaves[1].side, 'away');
  assert.equal(leaves[0].pos, 0);
  assert.equal(leaves[31].code, 'CAN');
});

test('buildBracketTree level sizes are 16/8/4/2/1', () => {
  const { levels } = buildBracketTree(R32);
  assert.deepEqual(levels.map((l) => l.length), [16, 8, 4, 2, 1]);
});

test('buildBracketTree node pos is mean of children', () => {
  const { levels } = buildBracketTree(R32);
  assert.deepEqual(levels[0][0].children, [0, 1]);
  assert.equal(levels[0][0].pos, 0.5);
  assert.deepEqual(levels[1][0].children, [0.5, 2.5]);
  assert.equal(levels[1][0].pos, 1.5);
});

test('buildBracketTree tolerates missing matches (null codes)', () => {
  const { leaves } = buildBracketTree(R32.slice(0, 2));
  assert.equal(leaves.length, 32);
  assert.equal(leaves[0].code, 'BRA');
  assert.equal(leaves[4].code, null);
});

test('matchWinner only decides finished matches', () => {
  assert.equal(matchWinner(r32Match(0, 'BRA', 'JPN', 'finished', 2, 1)), 'BRA');
  assert.equal(matchWinner(r32Match(0, 'BRA', 'JPN', 'finished', 0, 3)), 'JPN');
  assert.equal(matchWinner(r32Match(0, 'BRA', 'JPN', 'live', 1, 1)), null);
  assert.equal(matchWinner(r32Match(0, 'BRA', 'JPN', 'finished', 1, 1)), null);
});

test('computeEliminated collects KO losers only', () => {
  const matches = [
    r32Match(0, 'BRA', 'JPN', 'finished', 2, 1),
    r32Match(1, 'GER', 'PAR', 'live', 0, 0),
    { stage: 'group', status: 'finished', home: 'ARG', away: 'NGA', homeScore: 3, awayScore: 0 },
  ];
  const out = computeEliminated(matches);
  assert.ok(out.has('JPN'));
  assert.ok(!out.has('BRA'));
  assert.ok(!out.has('PAR'));
  assert.ok(!out.has('NGA')); // group loss does not eliminate from the bracket
});

test('winnersByNode maps finished matches to level-index', () => {
  const matches = [
    r32Match(0, 'BRA', 'JPN', 'finished', 2, 1),
    r32Match(1, 'GER', 'PAR', 'finished', 1, 0),
    { id: 'r16a', stage: 'r16', kickoff: '2026-07-05T00:00:00Z', home: 'BRA', away: 'GER', status: 'finished', homeScore: 2, awayScore: 3 },
  ];
  const w = winnersByNode(matches);
  assert.equal(w.get('0-0'), 'BRA');
  assert.equal(w.get('0-1'), 'GER');
  assert.equal(w.get('1-0'), 'GER');
  assert.equal(w.get('0-2'), undefined);
});

test('buildBracketTree orders leaves by match id, not kickoff', () => {
  // Real KO data: kickoff order does NOT match bracket order. The bracket is
  // defined by match-id adjacency (consecutive ids meet in the next round).
  const late = {
    id: 'm100', stage: 'r32', kickoff: '2026-06-28T20:00:00Z',
    home: 'CCC', away: 'DDD', status: 'scheduled', homeScore: null, awayScore: null,
  };
  const early = {
    id: 'm101', stage: 'r32', kickoff: '2026-06-28T10:00:00Z',
    home: 'AAA', away: 'BBB', status: 'scheduled', homeScore: null, awayScore: null,
  };
  const { leaves } = buildBracketTree([late, early]);
  // id order m100 < m101 -> CCC/DDD occupy the first match slot regardless of
  // the earlier kickoff of m101.
  assert.equal(leaves[0].code, 'CCC');
  assert.equal(leaves[1].code, 'DDD');
  assert.equal(leaves[2].code, 'AAA');
  assert.equal(leaves[3].code, 'BBB');
});

test('winnersByNode places later-round winners by team codes, not kickoff index', () => {
  // 8 R32 matches -> level-1 nodes 0..3. A single finished R16 tie between the
  // winners of R32 nodes 2 & 3 must land on node 1-1, even though it is the
  // only (kickoff-first) R16 match.
  const r32 = [];
  for (let i = 0; i < 8; i++) {
    r32.push(r32Match(i, `W${i}`, `L${i}`, 'finished', 2, 0)); // W{i} wins each
  }
  const r16 = {
    id: 'r16x', stage: 'r16', kickoff: '2026-07-05T00:00:00Z',
    home: 'W2', away: 'W3', status: 'finished', homeScore: 1, awayScore: 0,
  };
  const w = winnersByNode([...r32, r16]);
  assert.equal(w.get('1-1'), 'W2'); // node whose children (0-2, 0-3) fed it
  assert.equal(w.get('1-0'), undefined); // NOT placed on the first node by kickoff
});

test('sortByKickoff does not mutate and sorts ascending', () => {
  const input = [r32Match(2, 'A', 'B'), r32Match(0, 'C', 'D')];
  const out = sortByKickoff(input);
  assert.equal(out[0].home, 'C');
  assert.equal(input[0].home, 'A');
});
