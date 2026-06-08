import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tournamentPhase } from '../js/phase.js';

const groupMatch = (status) => ({ stage: 'group', status });

test('empty matches array returns group', () => {
  assert.equal(tournamentPhase([]), 'group');
});

test('partial group stage (71/72 finished) returns group', () => {
  const matches = Array.from({ length: 71 }, () => groupMatch('finished'));
  matches.push(groupMatch('scheduled'));
  assert.equal(tournamentPhase(matches), 'group');
});

test('all 72 group matches finished returns knockout', () => {
  const matches = Array.from({ length: 72 }, () => groupMatch('finished'));
  assert.equal(tournamentPhase(matches), 'knockout');
});

test('72 finished group matches plus knockout fixtures still returns knockout', () => {
  const matches = [
    ...Array.from({ length: 72 }, () => groupMatch('finished')),
    { stage: 'r32', status: 'scheduled' },
    { stage: 'r32', status: 'scheduled' },
  ];
  assert.equal(tournamentPhase(matches), 'knockout');
});
