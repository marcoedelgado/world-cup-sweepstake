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
  renderForm(teams, initialNames);
}

function pickInitialNames(owners) {
  const existing = (owners?.owners ?? []).map((o) => o.name).filter(Boolean);
  while (existing.length < 6) existing.push(`Owner ${existing.length + 1}`);
  return existing.slice(0, 6);
}

function renderForm(teams, names) {
  ROOT.innerHTML = `
    <header class="pn-header"></header>
    <section class="pn-cover">
      <h1 class="pn-title">The Draw</h1>
      <div class="pn-subtitle">Six owners · Eight teams each</div>
    </section>
    <p class="draw-current">Enter the names below, then begin.</p>
    <form class="draw-form" id="draw-form">
      ${names.map((n, i) => `<input name="owner-${i}" value="${escape(n)}" required maxlength="24" />`).join('')}
      <button type="submit">Begin the Draw</button>
    </form>
  `;
  document.getElementById('draw-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const names = [...new FormData(ev.target).values()].map((v) => String(v).trim()).filter(Boolean);
    if (names.length !== 6) return alert('Need exactly 6 owners.');
    runDraw(teams, names);
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

// runRoundRobin is added in Task 5

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
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cssEscape(s) { return String(s).replace(/"/g, '\\"'); }
