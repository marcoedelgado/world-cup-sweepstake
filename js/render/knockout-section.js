import { renderBracket } from './bracket-render.js';
import { pickLiveMatches, syncStickerLiveClass, syncCellLiveClass } from './live.js';

const STORAGE_KEY = 'sweep26.knockoutOpen';

export function renderKnockoutSection(container, state) {
  const matches = state.results?.matches ?? [];
  const hasR32 = matches.some((m) => m.stage === 'r32');
  if (!hasR32) return;

  const section = document.createElement('section');
  section.className = 'pn-section pn-knockout';

  const isOpen = readOpen();
  if (!isOpen) section.classList.add('collapsed');

  section.innerHTML = `
    <h3>Knockout bracket</h3>
    <button type="button" class="pn-knockout-toggle">${toggleLabel(isOpen)}</button>
    <div class="pn-knockout-body"></div>
  `;

  const body = section.querySelector('.pn-knockout-body');
  let rendered = false;
  const renderIfNeeded = () => {
    if (rendered) return;
    renderBracket(body, state);
    rendered = true;
    const live = pickLiveMatches(state.results?.matches ?? [], new Date().toISOString());
    syncStickerLiveClass(live);
    syncCellLiveClass(live);
  };

  const btn = section.querySelector('.pn-knockout-toggle');
  btn.addEventListener('click', () => {
    const nowOpen = section.classList.contains('collapsed');
    section.classList.toggle('collapsed', !nowOpen);
    btn.textContent = toggleLabel(nowOpen);
    writeOpen(nowOpen);
    if (nowOpen) renderIfNeeded();
  });

  container.appendChild(section);
  if (isOpen) renderIfNeeded();
}

function toggleLabel(isOpen) {
  return isOpen ? '▾ Hide knockout bracket' : '▸ Show knockout bracket';
}

function readOpen() {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) === 'true'; }
  catch { return false; }
}
function writeOpen(open) {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, String(open)); }
  catch { /* private mode etc — ignore */ }
}
