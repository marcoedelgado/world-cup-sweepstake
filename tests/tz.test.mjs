import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, formatRelativeDay, formatMatchDateTime, setZone, getZone, ZONES } from '../js/tz.js';

// 2026-06-14T18:00:00Z = 19:00 BST in London, 21:00 EEST in Nicosia.
const ISO_KICK = '2026-06-14T18:00:00Z';
const NOW_SAME_DAY = '2026-06-14T22:00:00Z'; // "today" in both zones
const NOW_NEXT_DAY = '2026-06-15T08:00:00Z'; // "yesterday" in both zones

test('zone constants are exported', () => {
  assert.equal(ZONES.UK, 'Europe/London');
  assert.equal(ZONES.CY, 'Asia/Nicosia');
});

test('default zone is UK when nothing stored', () => {
  globalThis.localStorage = makeStubStorage();
  assert.equal(getZone(), 'Europe/London');
});

test('setZone persists and getZone reads it back', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Asia/Nicosia');
  assert.equal(getZone(), 'Asia/Nicosia');
});

test('formatTime renders 24-hour in current zone', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Europe/London');
  assert.equal(formatTime(ISO_KICK), '19:00');
  setZone('Asia/Nicosia');
  assert.equal(formatTime(ISO_KICK), '21:00');
});

test('formatRelativeDay returns Today / Yesterday / explicit date', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Europe/London');
  assert.equal(formatRelativeDay(ISO_KICK, NOW_SAME_DAY), 'Today');
  assert.equal(formatRelativeDay(ISO_KICK, NOW_NEXT_DAY), 'Yesterday');
  assert.equal(
    formatRelativeDay('2026-06-11T20:00:00Z', NOW_NEXT_DAY),
    '11 Jun'
  );
});

test('formatMatchDateTime combines day label with time', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Europe/London');
  assert.equal(formatMatchDateTime(ISO_KICK, NOW_SAME_DAY), 'Today · 19:00');
  assert.equal(formatMatchDateTime(ISO_KICK, NOW_NEXT_DAY), 'Yesterday · 19:00');
});

function makeStubStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
