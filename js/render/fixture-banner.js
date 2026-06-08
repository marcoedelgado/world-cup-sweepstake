import { escape } from '../utils.js';

// Renders a prominent banner when the page is loaded with ?fixture=<name>.
// Called as the first thing inside each page's paint() so it survives re-renders.
export function renderFixtureBanner(container, fixtureMode) {
  if (!fixtureMode) return;
  const banner = document.createElement('div');
  banner.className = 'fixture-banner';
  banner.innerHTML = `TEST DATA · fixture: <strong>${escape(fixtureMode)}</strong>`;
  container.appendChild(banner);
}
