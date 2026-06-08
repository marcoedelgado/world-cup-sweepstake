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

test('isAlive: team in R32 fixture is alive even if 3rd in group', () => {
  const teams = [
    { code: 'CZE', group: 'A' }, { code: 'KOR', group: 'A' },
    { code: 'MEX', group: 'A' }, { code: 'RSA', group: 'A' },
  ];
  const groupFinished = [
    { stage: 'group', group: 'A', status: 'finished', home: 'MEX', away: 'CZE', homeScore: 2, awayScore: 0 },
    { stage: 'group', group: 'A', status: 'finished', home: 'KOR', away: 'RSA', homeScore: 1, awayScore: 0 },
    { stage: 'group', group: 'A', status: 'finished', home: 'MEX', away: 'KOR', homeScore: 1, awayScore: 1 },
    { stage: 'group', group: 'A', status: 'finished', home: 'CZE', away: 'RSA', homeScore: 2, awayScore: 1 },
    { stage: 'group', group: 'A', status: 'finished', home: 'MEX', away: 'RSA', homeScore: 3, awayScore: 0 },
    { stage: 'group', group: 'A', status: 'finished', home: 'KOR', away: 'CZE', homeScore: 1, awayScore: 0 },
  ];
  // CZE finishes 3rd (3 points). MEX & KOR are top 2. RSA bottom.
  // R32 fixture promotes CZE as a wildcard.
  const r32 = [
    { stage: 'r32', status: 'scheduled', home: 'BRA', away: 'CZE' },
  ];
  const matches = [...groupFinished, ...r32];
  assert.equal(isAlive('CZE', teams, matches), true, 'CZE survives via wildcard');
  assert.equal(isAlive('RSA', teams, matches), false, 'RSA out (not in R32)');
});

test('isAlive: team eliminated in knockout match returns false even if in later fixture', () => {
  const teams = [{ code: 'ESP', group: 'H' }, { code: 'URU', group: 'H' }];
  const matches = [
    { stage: 'r32', status: 'finished', home: 'ESP', away: 'URU', homeScore: 2, awayScore: 1 },
    { stage: 'r16', status: 'scheduled', home: 'ESP', away: 'TBD' },
  ];
  assert.equal(isAlive('URU', teams, matches), false);
  assert.equal(isAlive('ESP', teams, matches), true);
});
