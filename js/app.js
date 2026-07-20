import { loadAll, fixtureMode, withFixture } from './data.js';
import { renderHeader }         from './render/header.js';
import { renderCover }          from './render/cover.js';
import { renderAlbumGroup, renderAlbumHeat } from './render/album.js';
import { renderLatestResults }  from './render/results.js';
import { renderUpcoming }       from './render/upcoming.js';
import { renderStandingsSection } from './render/standings-section.js';
import { renderKnockoutSection } from './render/knockout-section.js';
import { renderFooter }         from './render/footer.js';
import { renderFixtureBanner }  from './render/fixture-banner.js';
import { initTeamTooltips }     from './render/team-tooltip.js';
import { fetchLiveMatches, mergeLive } from './live.js';
import { mountLiveSection } from './render/live.js';
import { renderWinnerHero } from './render/winner-hero.js';
import { escape } from './utils.js';
import { FEATURES } from './config.js';
import { tournamentPhase } from './phase.js';

const FIRST_KICKOFF_ISO = '2026-06-11T20:00:00Z';
let stopLive = null;

async function main() {
  const root = document.getElementById('app');
  let state;
  try {
    state = await loadAll();
  } catch (err) {
    root.innerHTML = `<p class="error">Couldn't load tournament data — ${escape(err.message)}</p>`;
    return;
  }

  paint(root, state);
  initTeamTooltips();
  if (!fixtureMode) {
    fetchLiveMatches().then((live) => {
      if (!live.length) return;
      state = { ...state, results: { ...state.results, matches: mergeLive(state.results.matches ?? [], live) } };
      paint(root, state);
    });
  }
  window.addEventListener('tz-change', () => paint(root, state));
  window.addEventListener('results-change', () => paint(root, state));
}

function paint(root, state) {
  const scrollY = window.scrollY;
  root.innerHTML = '';
  const now = new Date().toISOString();
  const phase = tournamentPhase(state.results?.matches ?? []);

  renderHeader(root);
  renderFixtureBanner(root, fixtureMode);
  renderCover(root, state, now);

  if (!state.owners?.drawCompletedAt) {
    renderPreDrawBanner(root);
  } else {
    renderWinnerHero(root, state);
    if (stopLive) stopLive();
    stopLive = mountLiveSection(root, state);
    if (FEATURES.transformAlbum && phase === 'knockout') {
      renderAlbumHeat(root, state);
    } else {
      renderAlbumGroup(root, state);
    }
    renderKnockoutSection(root, state);
    if (FEATURES.groupStandings) {
      renderStandingsSection(root, state);
    }
    if (phase !== 'knockout') {
      renderLatestResults(root, state, now);
      renderUpcoming(root, state, now);
    }
  }
  renderFooter(root, state, now);
  window.scrollTo(0, scrollY);
}

function renderPreDrawBanner(root) {
  const el = document.createElement('div');
  el.className = 'pn-empty';
  el.innerHTML = `The draw hasn't happened yet — head to <a href="${withFixture('draw.html')}">/draw</a> to run it.`;
  root.appendChild(el);
}

main();
