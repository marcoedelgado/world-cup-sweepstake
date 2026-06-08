import { loadAll } from './data.js';
import { renderHeader }         from './render/header.js';
import { renderCover }          from './render/cover.js';
import { renderStatus }         from './render/status.js';
import { renderAlbumGroup, renderAlbumHeat } from './render/album.js';
import { renderLatestResults }  from './render/results.js';
import { renderUpcoming }       from './render/upcoming.js';
import { renderStandingsSection } from './render/standings-section.js';
import { renderFooter }         from './render/footer.js';
import { fetchLiveMatches, mergeLive } from './live.js';
import { escape } from './utils.js';
import { FEATURES } from './config.js';
import { tournamentPhase } from './phase.js';

const FIRST_KICKOFF_ISO = '2026-06-11T20:00:00Z';

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
  fetchLiveMatches().then((live) => {
    if (!live.length) return;
    state = { ...state, results: { ...state.results, matches: mergeLive(state.results.matches ?? [], live) } };
    paint(root, state);
  });
  window.addEventListener('tz-change', () => paint(root, state));
}

function paint(root, state) {
  root.innerHTML = '';
  const now = new Date().toISOString();
  const phase = tournamentPhase(state.results?.matches ?? []);

  renderHeader(root);
  renderCover(root, state, now);

  if (!state.owners?.drawCompletedAt) {
    renderPreDrawBanner(root);
  } else {
    renderStatus(root, state, now);
    if (FEATURES.transformAlbum && phase === 'knockout') {
      renderAlbumHeat(root, state);
    } else {
      renderAlbumGroup(root, state);
    }
    if (FEATURES.groupStandings) {
      renderStandingsSection(root, state);
    }
    renderLatestResults(root, state, now);
    renderUpcoming(root, state, now);
  }
  renderFooter(root, state, now);
}

function renderPreDrawBanner(root) {
  const el = document.createElement('div');
  el.className = 'pn-empty';
  el.innerHTML = `The draw hasn't happened yet — head to <a href="draw.html">/draw</a> to run it.`;
  root.appendChild(el);
}

main();
