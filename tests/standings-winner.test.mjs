import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getWinner } from '../js/standings.js';

function finalMatch(home, h, a, away, status = 'finished') {
  return { id: 'final', stage: 'final', home, away, homeScore: h, awayScore: a, status };
}

test('getWinner returns null when no matches', () => {
  assert.equal(getWinner([]), null);
});

test('getWinner returns null when final not finished', () => {
  const m = finalMatch('FRA', 0, 0, 'ARG', 'scheduled');
  assert.equal(getWinner([m]), null);
});

test('getWinner returns home team when home wins', () => {
  const m = finalMatch('FRA', 2, 0, 'ARG');
  assert.deepEqual(getWinner([m]), { teamCode: 'FRA' });
});

test('getWinner returns away team when away wins', () => {
  const m = finalMatch('FRA', 0, 1, 'ARG');
  assert.deepEqual(getWinner([m]), { teamCode: 'ARG' });
});

test('getWinner ignores non-final finished matches', () => {
  const sf = { id: 'sf1', stage: 'sf', home: 'FRA', away: 'ARG', homeScore: 2, awayScore: 0, status: 'finished' };
  assert.equal(getWinner([sf]), null);
});
