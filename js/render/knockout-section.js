import { renderBracket } from './bracket-render.js';
import { renderRadial } from './radial-bracket.js';
import { pickLiveMatches, syncStickerLiveClass, syncCellLiveClass } from './live.js';

const OPEN_KEY = 'sweep26.knockoutOpen';
const VIEW_KEY = 'sweep26.knockoutView';

export function renderKnockoutSection(container, state) {
  const matches = state.results?.matches ?? [];
  if (!matches.some((m) => m.stage === 'r32')) return;

  const section = document.createElement('section');
  section.className = 'pn-section pn-knockout';

  const isOpen = readOpen();
  if (!isOpen) section.classList.add('collapsed');

  section.innerHTML = `
    <h3>Knockout bracket</h3>
    <button type="button" class="pn-knockout-toggle">${toggleLabel(isOpen)}</button>
    <div class="pn-knockout-body">
      <div class="pn-koview">
        <button type="button" data-view="radial">Radial</button>
        <button type="button" data-view="classic">Classic bracket</button>
      </div>
      <div class="pn-koview-body"></div>
    </div>
  `;

  const viewBody = section.querySelector('.pn-koview-body');
  const viewBtns = [...section.querySelectorAll('.pn-koview [data-view]')];
  let rendered = false;

  const renderView = (view) => {
    viewBody.innerHTML = '';
    if (view === 'classic') renderBracket(viewBody, state);
    else renderRadial(viewBody, state);
    viewBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    writeView(view);
    // Live classes only match the classic bracket's stickers/cells; harmless otherwise.
    const live = pickLiveMatches(state.results?.matches ?? [], new Date().toISOString());
    syncStickerLiveClass(live);
    syncCellLiveClass(live);
  };

  const renderIfNeeded = () => {
    if (rendered) return;
    renderView(readView());
    rendered = true;
  };

  section.querySelector('.pn-koview').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (btn) renderView(btn.dataset.view);
  });

  const toggleBtn = section.querySelector('.pn-knockout-toggle');
  toggleBtn.addEventListener('click', () => {
    const nowOpen = section.classList.contains('collapsed');
    section.classList.toggle('collapsed', !nowOpen);
    toggleBtn.textContent = toggleLabel(nowOpen);
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
  try { return globalThis.localStorage?.getItem(OPEN_KEY) === 'true'; }
  catch { return false; }
}
function writeOpen(open) {
  try { globalThis.localStorage?.setItem(OPEN_KEY, String(open)); }
  catch { /* private mode etc — ignore */ }
}
function readView() {
  try { return globalThis.localStorage?.getItem(VIEW_KEY) === 'classic' ? 'classic' : 'radial'; }
  catch { return 'radial'; }
}
function writeView(view) {
  try { globalThis.localStorage?.setItem(VIEW_KEY, view); }
  catch { /* ignore */ }
}
