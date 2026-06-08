import { formatTime } from '../tz.js';
import { tournamentPhase } from '../phase.js';
import { FEATURES } from '../config.js';
import { withFixture } from '../data.js';

export function renderFooter(container, { results }, nowIso = new Date().toISOString()) {
  const foot = document.createElement('footer');
  foot.className = 'pn-foot';

  const lastUpdated = results?.lastUpdated;
  const refreshLabel = lastUpdated
    ? `last refresh ${formatTime(lastUpdated)}`
    : 'no refresh yet';

  const phase = tournamentPhase(results?.matches ?? []);
  const bracketLink = FEATURES.bracket && phase === 'knockout'
    ? ` · <a href="${withFixture('bracket.html')}">View the bracket →</a>`
    : '';

  foot.innerHTML = `★ ${refreshLabel} · <a href="${withFixture('draw.html')}">/draw</a>${bracketLink} ★`;
  container.appendChild(foot);
}
