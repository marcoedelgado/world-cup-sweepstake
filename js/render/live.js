import { renderStatus } from './status.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, flag } from '../utils.js';
import { labelForStage } from './cover.js';

const PRE_ROLL_MIN = 10;
const GROUP_END_MIN = 110;
const KNOCKOUT_END_MIN = 150;
const TICK_MS = 30_000;

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
    .sort((a, b) => {
      const dk = a.kickoff.localeCompare(b.kickoff);
      return dk !== 0 ? dk : String(a.id).localeCompare(String(b.id));
    });
}

function timeChip(match, nowMs) {
  const k = Date.parse(match.kickoff);
  if (nowMs < k) {
    const minsToKickoff = Math.max(0, Math.ceil((k - nowMs) / 60_000));
    return `Kicks off in ${minsToKickoff} min`;
  }
  const minsElapsed = Math.max(0, Math.floor((nowMs - k) / 60_000));
  return `${minsElapsed}'`;
}

function stageChip(match) {
  if (match.stage === 'group' && match.group) return `Group ${match.group}`;
  return labelForStage(match.stage);
}

function buildBand(match, state, nowIso) {
  const nowMs = Date.parse(nowIso);
  const home = teamByCode(state.teams, match.home);
  const away = teamByCode(state.teams, match.away);
  const homeOwner = ownerForTeam(state.owners, match.home);
  const awayOwner = ownerForTeam(state.owners, match.away);

  const el = document.createElement('section');
  el.className = 'pn-live';
  el.innerHTML = `
    <div class="pn-live-head">
      <span class="pn-live-dot"></span>
      <span class="pn-live-label">Live now</span>
      <span class="pn-live-stage">· ${escape(stageChip(match))}</span>
      <span class="pn-live-when">${escape(timeChip(match, nowMs))}</span>
    </div>
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

  function tick() {
    const nowIso = new Date().toISOString();
    const live = pickLiveMatches(state.results?.matches ?? [], nowIso);
    slot.innerHTML = '';
    if (live.length) {
      for (const m of live) slot.appendChild(buildBand(m, state, nowIso));
    } else {
      renderStatus(slot, state, nowIso);
    }
  }

  tick();
  const id = setInterval(tick, TICK_MS);
  return () => {
    clearInterval(id);
    slot.remove();
  };
}
