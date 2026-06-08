import { escape } from './utils.js';

const ROOT = document.getElementById('draw');
const REVEAL_DELAY_MS = 350;
const POST_OWNER_PAUSE_MS = 600;

main();

async function main() {
  let teams, owners;
  try {
    [teams, owners] = await Promise.all([
      fetch('data/teams.json').then((r) => r.json()),
      fetch('data/owners.json').then((r) => r.json()).catch(() => ({ owners: [] })),
    ]);
  } catch (err) {
    ROOT.innerHTML = `<p class="error">Couldn't load data: ${escape(err.message)}</p>`;
    return;
  }

  const initialNames = pickInitialNames(owners);
  const fromHash = readHash();
  if (fromHash) {
    renderResult(teams, fromHash);
    return;
  }
  renderModePicker(teams, initialNames);
}

function pickInitialNames(owners) {
  const existing = (owners?.owners ?? []).map((o) => o.name).filter(Boolean);
  while (existing.length < 6) existing.push(`Owner ${existing.length + 1}`);
  return existing.slice(0, 6);
}

const MODE_LABELS = {
  classic:    'Classic',
  roundrobin: 'Round-by-round',
};

function renderModePicker(teams, names) {
  ROOT.innerHTML = `
    <section class="pn-cover">
      <h1 class="pn-title">The Draw</h1>
      <div class="pn-subtitle">Pick a mode</div>
    </section>
    <div class="pn-owners">
      <div class="pn-owner draw-mode-card" data-mode="classic">
        <div class="pn-owner-name"><span>Classic</span></div>
        <p>All 8 in one go — first owner gets their full eight, then the next owner, and so on.</p>
        <p class="mode-meta">~3–4 minutes.</p>
      </div>
      <div class="pn-owner draw-mode-card" data-mode="roundrobin">
        <div class="pn-owner-name"><span>Round-by-round</span></div>
        <p>One each, click Next, repeat 8 times. Group gets to react between rounds.</p>
        <p class="mode-meta">8 rounds, as long as the group wants.</p>
      </div>
    </div>
  `;
  for (const card of ROOT.querySelectorAll('.draw-mode-card')) {
    card.addEventListener('click', () => {
      renderForm(teams, names, card.dataset.mode);
    });
  }
}

function renderForm(teams, names, mode = 'classic') {
  ROOT.innerHTML = `
    <header class="pn-header"></header>
    <section class="pn-cover">
      <h1 class="pn-title">The Draw</h1>
      <div class="pn-subtitle">Six owners · Eight teams each</div>
      <p class="mode-breadcrumb">Mode: <strong>${escape(MODE_LABELS[mode] ?? 'Classic')}</strong> · <a data-action="change-mode">change</a></p>
    </section>
    <p class="draw-current">Enter the names below, then begin.</p>
    <form class="draw-form" id="draw-form">
      ${names.map((n, i) => `<input name="owner-${i}" value="${escape(n)}" required maxlength="24" />`).join('')}
      <button type="submit">Begin the Draw</button>
    </form>
  `;
  document.querySelector('[data-action="change-mode"]').addEventListener('click', (ev) => {
    ev.preventDefault();
    renderModePicker(teams, names);
  });
  document.getElementById('draw-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const submitted = [...new FormData(ev.target).values()].map((v) => String(v).trim()).filter(Boolean);
    if (submitted.length !== 6) return alert('Need exactly 6 owners.');
    runDraw(teams, submitted, mode);
  });
}

async function runDraw(teams, names, mode = 'classic') {
  renderDrawScaffold(teams, names);

  const pool = [...teams];
  shuffle(pool);

  const result = { drawCompletedAt: null, owners: names.map((n) => ({ name: n, teams: [] })) };

  if (mode === 'roundrobin') {
    await runRoundRobin(pool, result);
  } else {
    await runClassic(pool, result);
  }

  result.drawCompletedAt = new Date().toISOString();
  writeHash(result);
  renderResult(teams, result);
}

function renderDrawScaffold(teams, names) {
  ROOT.innerHTML = `
    <section class="pn-cover">
      <h1 class="pn-title">The Draw</h1>
      <div class="pn-subtitle">Drawing now…</div>
    </section>
    <p class="draw-current" id="draw-current">Preparing…</p>
    <div class="draw-pool" id="draw-pool">
      ${teams.map((t) => stickerHtml(t)).join('')}
    </div>
    <div class="pn-owners" id="draw-owners">
      ${names.map((n) => `
        <div class="pn-owner">
          <div class="pn-owner-name"><span>${escape(n)}</span><span class="pn-owner-alive">0 / 8</span></div>
          <div class="pn-stickers" data-owner="${escape(n)}"></div>
        </div>`).join('')}
    </div>
  `;
}

async function runClassic(pool, result) {
  const currentEl = document.getElementById('draw-current');
  for (const owner of result.owners) {
    currentEl.textContent = `Drawing for ${owner.name}…`;
    for (let i = 0; i < 8; i++) {
      const team = pool.pop();
      owner.teams.push(team.code);
      hideFromPool(team.code);
      addToOwnerCard(owner.name, team);
      updateOwnerCount(owner.name, owner.teams.length);
      await delay(REVEAL_DELAY_MS);
    }
    await delay(POST_OWNER_PAUSE_MS);
  }
}

async function runRoundRobin(pool, result) {
  const currentEl = document.getElementById('draw-current');
  const TOTAL_ROUNDS = 8;

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    currentEl.textContent = `Round ${round} of ${TOTAL_ROUNDS} — drawing…`;
    for (const owner of result.owners) {
      const team = pool.pop();
      owner.teams.push(team.code);
      hideFromPool(team.code);
      addToOwnerCard(owner.name, team);
      updateOwnerCount(owner.name, owner.teams.length);
      await delay(REVEAL_DELAY_MS);
    }
    if (round < TOTAL_ROUNDS) {
      currentEl.textContent = `Round ${round} complete. Ready for round ${round + 1}?`;
      await waitForNextRound(round + 1, TOTAL_ROUNDS);
    }
  }
  currentEl.textContent = 'All 8 rounds complete.';
}

function waitForNextRound(nextRound, total) {
  return new Promise((resolve) => {
    const container = document.getElementById('draw-owners');
    const wrap = document.createElement('div');
    wrap.className = 'draw-actions';
    wrap.innerHTML = `<button type="button" id="next-round">Next round (${nextRound} / ${total})</button>`;
    container.insertAdjacentElement('afterend', wrap);
    document.getElementById('next-round').addEventListener('click', () => {
      wrap.remove();
      resolve();
    });
  });
}

function renderResult(teams, result) {
  ROOT.innerHTML = `
    <section class="pn-cover">
      <h1 class="pn-title">Draw Complete</h1>
      <div class="pn-subtitle">${new Date(result.drawCompletedAt).toUTCString()}</div>
    </section>
    <div class="pn-owners">
      ${result.owners.map((o) => `
        <div class="pn-owner">
          <div class="pn-owner-name"><span>${escape(o.name)}</span><span class="pn-owner-alive">${o.teams.length} teams</span></div>
          <div class="pn-stickers">${o.teams.map((c) => stickerHtml(teamByCode(teams, c))).join('')}</div>
        </div>`).join('')}
    </div>
    <div class="draw-actions">
      <button type="button" id="dl">Download owners.json</button>
      <button type="button" id="copy">Copy share link</button>
      <button type="button" id="redo">Redo draw</button>
    </div>
    <p class="draw-current">Commit the downloaded file to <code>data/owners.json</code> and push.</p>
  `;
  document.getElementById('dl').addEventListener('click', () => downloadJson(result));
  document.getElementById('copy').addEventListener('click', () => {
    navigator.clipboard.writeText(location.href).then(() => {
      document.getElementById('copy').textContent = 'Copied!';
    });
  });
  document.getElementById('redo').addEventListener('click', () => {
    location.hash = '';
    location.reload();
  });
}

function downloadJson(result) {
  const blob = new Blob([JSON.stringify(result, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'owners.json';
  a.click();
}

function hideFromPool(code) {
  document.querySelector(`#draw-pool [data-code="${code}"]`)?.classList.add('taken');
}
function addToOwnerCard(name, team) {
  const grid = document.querySelector(`[data-owner="${cssEscape(name)}"]`);
  if (grid) grid.insertAdjacentHTML('beforeend', stickerHtml(team));
}
function updateOwnerCount(name, count) {
  const card = document.querySelector(`[data-owner="${cssEscape(name)}"]`)?.closest('.pn-owner');
  card?.querySelector('.pn-owner-alive')?.replaceChildren(document.createTextNode(`${count} / 8`));
}

function stickerHtml(t) {
  if (!t) return '';
  return `<div class="pn-sticker" data-code="${escape(t.code)}" title="${escape(t.name)}"><span class="flag">${t.flag}</span><span class="code">${escape(t.code)}</span></div>`;
}

function shuffle(arr) {
  const bytes = new Uint32Array(arr.length);
  crypto.getRandomValues(bytes);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function teamByCode(teams, code) { return teams.find((t) => t.code === code); }

function readHash() {
  if (!location.hash.startsWith('#draw=')) return null;
  try { return JSON.parse(atob(decodeURIComponent(location.hash.slice('#draw='.length)))); } catch { return null; }
}
function writeHash(result) {
  history.replaceState(null, '', `#draw=${encodeURIComponent(btoa(JSON.stringify(result)))}`);
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }
function cssEscape(s) { return String(s).replace(/"/g, '\\"'); }
