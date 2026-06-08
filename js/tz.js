export const ZONES = Object.freeze({
  UK: 'Europe/London',
  CY: 'Asia/Nicosia',
});

const STORAGE_KEY = 'sweep26.tz';
const VALID = new Set(Object.values(ZONES));

export function getZone() {
  const stored = (globalThis.localStorage?.getItem(STORAGE_KEY) ?? '').trim();
  return VALID.has(stored) ? stored : ZONES.UK;
}

export function setZone(zoneId) {
  if (!VALID.has(zoneId)) throw new Error(`unknown zone: ${zoneId}`);
  globalThis.localStorage?.setItem(STORAGE_KEY, zoneId);
  globalThis.window?.dispatchEvent?.(new CustomEvent('tz-change', { detail: { zone: zoneId } }));
}

export function formatTime(iso, zone = getZone()) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: zone,
  }).format(new Date(iso));
}

export function formatRelativeDay(iso, nowIso = new Date().toISOString(), zone = getZone()) {
  const dayOf = (d) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date(d));
  const target = dayOf(iso);
  const today = dayOf(nowIso);

  const targetTs = Date.parse(target + 'T00:00:00Z');
  const todayTs  = Date.parse(today  + 'T00:00:00Z');
  const diffDays = Math.round((targetTs - todayTs) / 86_400_000);

  if (diffDays === 0)  return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1)  return 'Tomorrow';

  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: zone }).format(new Date(iso));
}

export function formatMatchDateTime(iso, nowIso = new Date().toISOString(), zone = getZone()) {
  return `${formatRelativeDay(iso, nowIso, zone)} · ${formatTime(iso, zone)}`;
}
