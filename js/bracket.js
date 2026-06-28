import { loadAll, fixtureMode, withFixture, reloadResults } from './data.js';
import { renderHeader } from './render/header.js';
import { renderBracket } from './render/bracket-render.js';
import { renderFixtureBanner } from './render/fixture-banner.js';
import { initTeamTooltips } from './render/team-tooltip.js';
import { pickLiveMatches, syncStickerLiveClass, syncCellLiveClass } from './render/live.js';
import { tournamentPhase } from './phase.js';
import { escape } from './utils.js';
import { formatMatchDateTime } from './tz.js';

const LIVE_SYNC_MS = 30_000;

async function main() {
  const root = document.getElementById('bracket');
  let state;
  try {
    state = await loadAll();
  } catch (err) {
    root.innerHTML = `<p class="error">Couldn't load tournament data — ${escape(err.message)}</p>`;
    return;
  }

  paint(root, state);
  initTeamTooltips();
  window.addEventListener('tz-change', () => paint(root, state));

  if (!fixtureMode) {
    const applyLive = () => {
      const live = pickLiveMatches(state.results?.matches ?? [], new Date().toISOString());
      syncStickerLiveClass(live);
      syncCellLiveClass(live);
    };
    const sync = async () => {
      try {
        const fresh = await reloadResults();
        state.results = fresh;
        paint(root, state);
      } catch { /* keep stale */ }
      applyLive();
    };
    applyLive();
    setInterval(sync, LIVE_SYNC_MS);
  }
}

function paint(root, state) {
  root.innerHTML = '';
  renderHeader(root);
  renderFixtureBanner(root, fixtureMode);

  const phase = tournamentPhase(state.results?.matches ?? []);
  const hasR32Fixtures = (state.results?.matches ?? []).some((m) => m.stage === 'r32');

  if (phase === 'group' && !hasR32Fixtures) {
    renderPreKnockout(root, state);
    return;
  }
  renderBracket(root, state);
}

function renderPreKnockout(root, state) {
  const firstR32 = (state.results?.matches ?? [])
    .filter((m) => m.stage === 'r32')
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''))[0];
  const when = firstR32?.kickoff
    ? `First R32 match: ${formatMatchDateTime(firstR32.kickoff)}`
    : 'R32 fixtures will appear here when published.';
  const card = document.createElement('div');
  card.className = 'pn-empty';
  card.innerHTML = `The knockouts haven't started yet. ${when}<br/><a href="${withFixture('index.html')}">← Back to the album</a>`;
  root.appendChild(card);
}

main();
