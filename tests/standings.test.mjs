import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings, isAlive } from '../js/standings.js';

const TEAMS = [
  { code: 'BRA', name: 'Brazil',     group: 'B' },
  { code: 'ARG', name: 'Argentina',  group: 'B' },
  { code: 'COL', name: 'Colombia',   group: 'B' },
  { code: 'URU', name: 'Uruguay',    group: 'B' },
];

function finished(home, h, a, away, kickoff = '2026-06-12T00:00:00Z') {
  return {
    id: `${home}-${away}`,
    stage: 'group',
    group: 'B',
    kickoff,
    home, away,
    status: 'finished',
    homeScore: h, awayScore: a,
  };
}

test('computeStandings orders by points then GD then GF', () => {
  const matches = [
    finished('BRA', 2, 0, 'ARG'),   // BRA win
    finished('COL', 1, 1, 'URU'),   // draw
    finished('BRA', 3, 0, 'COL'),   // BRA win
    finished('ARG', 2, 0, 'URU'),   // ARG win
    finished('BRA', 1, 0, 'URU'),   // BRA win
    finished('ARG', 2, 1, 'COL'),   // ARG win
  ];
  const table = computeStandings('B', TEAMS, matches);
  assert.equal(table[0].code, 'BRA');
  assert.equal(table[0].points, 9);
  assert.equal(table[1].code, 'ARG');
  assert.equal(table[1].points, 6);
  // URU and COL both finish on 1 point; URU has the better GD (-3 vs -4), so URU is 3rd.
  assert.equal(table[2].code, 'URU');
  assert.equal(table[3].code, 'COL');
});

test('isAlive: group stage in progress → all teams alive', () => {
  const matches = [finished('BRA', 2, 0, 'ARG')];
  for (const t of TEAMS) assert.equal(isAlive(t.code, TEAMS, matches), true);
});

test('isAlive: after all group games, top 2 alive, others eliminated', () => {
  const matches = [
    finished('BRA', 2, 0, 'ARG'),
    finished('COL', 1, 1, 'URU'),
    finished('BRA', 3, 0, 'COL'),
    finished('ARG', 2, 0, 'URU'),
    finished('BRA', 1, 0, 'URU'),
    finished('ARG', 2, 1, 'COL'),
  ];
  assert.equal(isAlive('BRA', TEAMS, matches), true);
  assert.equal(isAlive('ARG', TEAMS, matches), true);
  assert.equal(isAlive('COL', TEAMS, matches), false);
  assert.equal(isAlive('URU', TEAMS, matches), false);
});

test('isAlive: knockout loss eliminates the loser', () => {
  const koMatch = {
    id: 'r16-bra-mex',
    stage: 'r16',
    kickoff: '2026-06-30T18:00:00Z',
    home: 'BRA', away: 'MEX',
    status: 'finished',
    homeScore: 1, awayScore: 2,
  };
  const knockoutTeams = [
    ...TEAMS,
    { code: 'MEX', name: 'Mexico', group: 'A' },
  ];
  assert.equal(isAlive('BRA', knockoutTeams, [koMatch]), false);
  assert.equal(isAlive('MEX', knockoutTeams, [koMatch]), true);
});

test('isAlive: live knockout match does not eliminate yet', () => {
  const live = {
    id: 'r16-bra-mex',
    stage: 'r16',
    kickoff: '2026-06-30T18:00:00Z',
    home: 'BRA', away: 'MEX',
    status: 'live',
    homeScore: 0, awayScore: 1,
  };
  assert.equal(isAlive('BRA', [{ code: 'BRA', group: 'B' }, { code: 'MEX', group: 'A' }], [live]), true);
});
