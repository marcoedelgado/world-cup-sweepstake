import { formatTime } from '../tz.js';

export function renderFooter(container, { results }, nowIso = new Date().toISOString()) {
  const foot = document.createElement('footer');
  foot.className = 'pn-foot';

  const lastUpdated = results?.lastUpdated;
  const refreshLabel = lastUpdated
    ? `last refresh ${formatTime(lastUpdated)}`
    : 'no refresh yet';

  foot.innerHTML = `★ ${refreshLabel} · <a href="draw.html">/draw</a> · /bracket coming 30 June ★`;
  container.appendChild(foot);
}
