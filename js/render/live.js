import { renderStatus } from './status.js';
import { teamByCode, ownerForTeam, reloadResults } from '../data.js';
import { escape, flag } from '../utils.js';
import { labelForStage } from './cover.js';
import { formatTime } from '../tz.js';

const PRE_ROLL_MIN = 10;
const GROUP_END_MIN = 110;
const KNOCKOUT_END_MIN = 150;
const PENDING_BUFFER_MIN = 60;  // grace period after natural end-of-window for status=finished, scores=null
const TICK_MS = 30_000;
const REFETCH_EVERY_N_TICKS = 2;  // 60s between background refreshes of results.json

export function endOffsetMinutes(stage) {
  return stage === 'group' ? GROUP_END_MIN : KNOCKOUT_END_MIN;
}

export function pickLiveMatches(matches, nowIso) {
  const now = Date.parse(nowIso);
  return matches
    .filter((m) => {
      if (!m.kickoff) return false;
      if (m.status === 'finished') return false;
      const k = Date.parse(m.kickoff);
      const start = k - PRE_ROLL_MIN * 60_000;
      const end = k + endOffsetMinutes(m.stage) * 60_000;
      return now >= start && now <= end;
    })
    .sort(byKickoffThenId);
}

export function pickPendingMatches(matches, nowIso) {
  const now = Date.parse(nowIso);
  return (matches ?? [])
    .filter((m) => {
      if (!m.kickoff) return false;
      if (m.status !== 'finished') return false;
      const hasScores = m.homeScore != null && m.awayScore != null;
      if (hasScores) return false;
      const k = Date.parse(m.kickoff);
      const upperBound = k + (endOffsetMinutes(m.stage) + PENDING_BUFFER_MIN) * 60_000;
      return now <= upperBound;
    })
    .sort(byKickoffThenId);
}

function byKickoffThenId(a, b) {
  const dk = a.kickoff.localeCompare(b.kickoff);
  return dk !== 0 ? dk : String(a.id).localeCompare(String(b.id));
}

function timeChip(match, nowMs) {
  const k = Date.parse(match.kickoff);
  if (nowMs >= k) return null;
  const minsToKickoff = Math.max(0, Math.ceil((k - nowMs) / 60_000));
  return `Kicks off in ${minsToKickoff} min`;
}

function stageChip(match) {
  if (match.stage === 'group' && match.group) return `Group ${match.group}`;
  return labelForStage(match.stage);
}

function matchFingerprint(matches) {
  return (matches ?? []).map((m) => `${m.id}|${m.status}|${m.homeScore}|${m.awayScore}`).join(',');
}

export function syncStickerLiveClass(liveMatches) {
  const codes = new Set();
  for (const m of liveMatches) { codes.add(m.home); codes.add(m.away); }
  for (const el of document.querySelectorAll('.pn-sticker[data-team]')) {
    el.classList.toggle('live', codes.has(el.dataset.team));
  }
}

export function syncCellLiveClass(liveMatches) {
  const ids = new Set(liveMatches.map((m) => String(m.id)));
  for (const el of document.querySelectorAll('[data-match-id]')) {
    el.classList.toggle('live', ids.has(el.dataset.matchId));
  }
}

function headHtml(match, nowMs, phase) {
  if (phase === 'pending') {
    return `
      <span class="pn-live-ft">FT</span>
      <span class="pn-live-label">Full time</span>
      <span class="pn-live-stage">· ${escape(stageChip(match))}</span>
      <span class="pn-live-when">Score landing soon…</span>
    `;
  }
  const chip = timeChip(match, nowMs);
  const ko = `KO ${formatTime(match.kickoff)}`;
  return `
    <span class="pn-live-dot"></span>
    <span class="pn-live-label">Live now</span>
    <span class="pn-live-stage">· ${escape(stageChip(match))}</span>
    <span class="pn-live-stage">· ${escape(ko)}</span>
    ${chip ? `<span class="pn-live-when">${escape(chip)}</span>` : ''}
  `;
}

function buildBand(match, state, nowIso, phase = 'live') {
  const nowMs = Date.parse(nowIso);
  const home = teamByCode(state.teams, match.home);
  const away = teamByCode(state.teams, match.away);
  const homeOwner = ownerForTeam(state.owners, match.home);
  const awayOwner = ownerForTeam(state.owners, match.away);

  const el = document.createElement('section');
  el.className = phase === 'pending' ? 'pn-live pending' : 'pn-live';
  el.innerHTML = `
    <div class="pn-live-head">${headHtml(match, nowMs, phase)}</div>
    <div class="pn-live-teams">
      <div class="pn-live-team home">
        <span class="pn-live-flag">${flag(home)}</span>
        <span class="pn-live-name">${escape(home?.name ?? match.home)}</span>
        ${homeOwner ? `<span class="pn-live-owner">${escape(homeOwner)}</span>` : ''}
      </div>
      <div class="pn-live-vs">vs</div>
      <div class="pn-live-team away">
        <span class="pn-live-flag">${flag(away)}</span>
        <span class="pn-live-name">${escape(away?.name ?? match.away)}</span>
        ${awayOwner ? `<span class="pn-live-owner">${escape(awayOwner)}</span>` : ''}
      </div>
    </div>
  `;
  return el;
}

export function mountLiveSection(container, state) {
  const slot = document.createElement('div');
  container.appendChild(slot);
  let tickCount = 0;

  async function tick() {
    tickCount++;
    if (tickCount % REFETCH_EVERY_N_TICKS === 0) {
      try {
        const fresh = await reloadResults();
        const changed = matchFingerprint(state.results?.matches) !== matchFingerprint(fresh.matches);
        state.results = fresh;
        if (changed) window.dispatchEvent(new CustomEvent('results-change'));
      } catch { /* keep stale state */ }
    }
    const nowIso = new Date().toISOString();
    const live = pickLiveMatches(state.results?.matches ?? [], nowIso);
    const pending = pickPendingMatches(state.results?.matches ?? [], nowIso);
    slot.innerHTML = '';
    if (live.length || pending.length) {
      for (const m of live) slot.appendChild(buildBand(m, state, nowIso, 'live'));
      for (const m of pending) slot.appendChild(buildBand(m, state, nowIso, 'pending'));
    } else {
      renderStatus(slot, state, nowIso);
    }
    syncStickerLiveClass(live);
    syncCellLiveClass(live);
  }

  tick();
  const id = setInterval(tick, TICK_MS);
  return () => {
    clearInterval(id);
    slot.remove();
  };
}
