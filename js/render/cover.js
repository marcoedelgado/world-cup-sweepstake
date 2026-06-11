import { formatRelativeDay } from '../tz.js';

function currentMatchdayLabel(results, nowIso) {
  const today = formatRelativeDay(nowIso, nowIso); // 'Today'
  const dateStr = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(new Date(nowIso));

  // Stage detection from the next scheduled or in-flight match.
  const active = results?.matches?.find((m) => m.status !== 'finished');
  const stageLabel = labelForStage(active?.stage ?? 'group');

  return `${stageLabel} · ${dateStr}`;
}

export function labelForStage(stage) {
  switch (stage) {
    case 'group':  return 'Group Stage';
    case 'r32':    return 'Round of 32';
    case 'r16':    return 'Round of 16';
    case 'qf':     return 'Quarter-finals';
    case 'sf':     return 'Semi-finals';
    case 'third':  return '3rd-Place Play-Off';
    case 'final':  return 'Final';
    default:       return 'World Cup';
  }
}

export function renderCover(container, { results }, nowIso = new Date().toISOString()) {
  const cover = document.createElement('section');
  cover.className = 'pn-cover';
  cover.innerHTML = `
    <h1 class="pn-title">The 2026 Sweepstake</h1>
    <div class="pn-subtitle">An Album of Glory</div>
    <div class="pn-matchday">${currentMatchdayLabel(results, nowIso)}</div>
  `;
  container.appendChild(cover);
}
