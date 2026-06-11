import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLiveMatches, pickPendingMatches, endOffsetMinutes } from '../js/render/live.js';

const KICKOFF = '2026-06-11T19:00:00Z';
const KICKOFF_MS = Date.parse(KICKOFF);
const isoOffset = (minutes) => new Date(KICKOFF_MS + minutes * 60_000).toISOString();

const groupMatch = (overrides = {}) => ({
  id: '1',
  kickoff: KICKOFF,
  stage: 'group',
  group: 'A',
  status: 'scheduled',
  home: 'MEX',
  away: 'RSA',
  homeScore: null,
  awayScore: null,
  ...overrides,
});

test('endOffsetMinutes: group returns 110', () => {
  assert.equal(endOffsetMinutes('group'), 110);
});

test('endOffsetMinutes: knockout stages return 150', () => {
  for (const stage of ['r32', 'r16', 'qf', 'sf', 'third', 'final']) {
    assert.equal(endOffsetMinutes(stage), 150, `stage ${stage}`);
  }
});

test('pickLiveMatches: empty input returns empty array', () => {
  assert.deepEqual(pickLiveMatches([], KICKOFF), []);
});

test('pickLiveMatches: includes match at exactly kickoff − 10 min (pre-roll boundary)', () => {
  const m = groupMatch();
  assert.deepEqual(pickLiveMatches([m], isoOffset(-10)), [m]);
});

test('pickLiveMatches: excludes match at kickoff − 11 min (outside pre-roll)', () => {
  const m = groupMatch();
  assert.deepEqual(pickLiveMatches([m], isoOffset(-11)), []);
});

test('pickLiveMatches: includes group match at exactly kickoff + 110 min (upper boundary)', () => {
  const m = groupMatch();
  assert.deepEqual(pickLiveMatches([m], isoOffset(110)), [m]);
});

test('pickLiveMatches: excludes group match at kickoff + 111 min', () => {
  const m = groupMatch();
  assert.deepEqual(pickLiveMatches([m], isoOffset(111)), []);
});

test('pickLiveMatches: includes knockout match at kickoff + 130 min (extra-time window)', () => {
  const m = groupMatch({ stage: 'r16' });
  assert.deepEqual(pickLiveMatches([m], isoOffset(130)), [m]);
});

test('pickLiveMatches: excludes knockout match at kickoff + 151 min', () => {
  const m = groupMatch({ stage: 'r16' });
  assert.deepEqual(pickLiveMatches([m], isoOffset(151)), []);
});

test('pickLiveMatches: excludes match in window but status finished', () => {
  const m = groupMatch({ status: 'finished' });
  assert.deepEqual(pickLiveMatches([m], isoOffset(30)), []);
});

test('pickLiveMatches: two matches same kickoff ordered by id ascending', () => {
  const a = groupMatch({ id: '2' });
  const b = groupMatch({ id: '1' });
  const out = pickLiveMatches([a, b], isoOffset(20));
  assert.deepEqual(out.map((m) => m.id), ['1', '2']);
});

test('pickLiveMatches: two matches different kickoffs ordered by kickoff ascending', () => {
  const later = groupMatch({ id: '2', kickoff: isoOffset(10) });
  const earlier = groupMatch({ id: '1' });
  const out = pickLiveMatches([later, earlier], isoOffset(20));
  assert.deepEqual(out.map((m) => m.id), ['1', '2']);
});

test('pickLiveMatches: match with null kickoff is excluded', () => {
  const m = groupMatch({ kickoff: null });
  assert.deepEqual(pickLiveMatches([m], isoOffset(30)), []);
});

test('pickPendingMatches: empty input returns empty array', () => {
  assert.deepEqual(pickPendingMatches([], KICKOFF), []);
});

test('pickPendingMatches: excludes scheduled match', () => {
  const m = groupMatch({ status: 'scheduled' });
  assert.deepEqual(pickPendingMatches([m], isoOffset(120)), []);
});

test('pickPendingMatches: excludes live match', () => {
  const m = groupMatch({ status: 'live' });
  assert.deepEqual(pickPendingMatches([m], isoOffset(60)), []);
});

test('pickPendingMatches: includes finished match with null scores within window', () => {
  const m = groupMatch({ status: 'finished' });
  assert.deepEqual(pickPendingMatches([m], isoOffset(120)), [m]);
});

test('pickPendingMatches: excludes finished match once scores are populated', () => {
  const m = groupMatch({ status: 'finished', homeScore: 2, awayScore: 0 });
  assert.deepEqual(pickPendingMatches([m], isoOffset(120)), []);
});

test('pickPendingMatches: still pending when only one score is populated', () => {
  const m = groupMatch({ status: 'finished', homeScore: null, awayScore: 0 });
  assert.deepEqual(pickPendingMatches([m], isoOffset(120)), [m]);
});

test('pickPendingMatches: includes group pending at kickoff + 170 min (upper bound)', () => {
  const m = groupMatch({ status: 'finished' });
  assert.deepEqual(pickPendingMatches([m], isoOffset(170)), [m]);
});

test('pickPendingMatches: excludes group pending at kickoff + 171 min (just past bound)', () => {
  const m = groupMatch({ status: 'finished' });
  assert.deepEqual(pickPendingMatches([m], isoOffset(171)), []);
});

test('pickPendingMatches: knockout pending bound extends to kickoff + 210 min', () => {
  const m = groupMatch({ stage: 'r16', status: 'finished' });
  assert.deepEqual(pickPendingMatches([m], isoOffset(210)), [m]);
  assert.deepEqual(pickPendingMatches([m], isoOffset(211)), []);
});

test('pickPendingMatches: match with null kickoff is excluded', () => {
  const m = groupMatch({ status: 'finished', kickoff: null });
  assert.deepEqual(pickPendingMatches([m], isoOffset(120)), []);
});
