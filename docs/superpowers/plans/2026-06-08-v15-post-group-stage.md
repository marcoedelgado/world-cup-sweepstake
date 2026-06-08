# v1.5 Post-Group-Stage Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship four independently-toggleable features that transform the dashboard as the tournament moves from groups into knockouts — a playoff bracket page, a "Heat Check" album transform, collapsible group standings, and a per-owner detail page.

**Architecture:** A single `js/config.js` module exports feature flags. A new `js/phase.js` derives `'group' | 'knockout'` from `data/results.json`. Each feature is its own render module under `js/render/` invoked by `app.js` (or a dedicated bootstrap for new pages). Adding/removing a feature touches one file and one flag.

**Tech Stack:** Vanilla ES modules, no build step. Tests run with `node --test`.

**Prerequisite:** Execute the `2026-06-08-extract-shared-utils` plan first (it creates `js/utils.js`). Every new render module in this plan imports `escape`, `ownerTag`, and `flag` from there. If you start this plan with `js/utils.js` missing, the first task will fail.

**Spec:** `docs/superpowers/specs/2026-06-08-v15-post-group-stage-design.md`

---

### Task 1: Add R32 stage to fetch-results.mjs

**Files:**
- Modify: `scripts/fetch-results.mjs`

The 48-team 2026 format introduces a Round-of-32 stage before R16. The current STAGE_MAP doesn't have it; once R32 fixtures appear in the football-data.org feed, they'd be dropped by `STAGE_MAP[m.stage] ?? 'group'` and treated as group-stage matches, which would corrupt standings.

- [ ] **Step 1: Add ROUND_OF_32 to STAGE_MAP**

Modify `scripts/fetch-results.mjs:14-22`. Change:

```js
const STAGE_MAP = {
  GROUP_STAGE: 'group',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};
```

To:

```js
const STAGE_MAP = {
  GROUP_STAGE: 'group',
  ROUND_OF_32: 'r32',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};
```

- [ ] **Step 2: Verify the script still parses**

Run:

```bash
node --check scripts/fetch-results.mjs
```

Expected: no output (success). Any output indicates a syntax error.

- [ ] **Step 3: Commit**

```bash
git add scripts/fetch-results.mjs
git commit -m "feat: map ROUND_OF_32 to 'r32' stage for 2026 format"
```

---

### Task 2: Create `js/config.js` with feature flags

**Files:**
- Create: `js/config.js`

A single module exporting a frozen `FEATURES` object. Frozen so any accidental mutation fails loudly. Use `Object.freeze` rather than `as const` since we're vanilla JS, no TypeScript.

- [ ] **Step 1: Create the file**

Create `js/config.js`:

```js
export const FEATURES = Object.freeze({
  bracket:        true,
  transformAlbum: true,
  groupStandings: true,
  ownerDetail:    true,
});
```

- [ ] **Step 2: Verify it loads as a module**

```bash
node -e "import('./js/config.js').then(m => console.log(JSON.stringify(m.FEATURES)))"
```

Expected output: `{"bracket":true,"transformAlbum":true,"groupStandings":true,"ownerDetail":true}`

- [ ] **Step 3: Commit**

```bash
git add js/config.js
git commit -m "feat: add js/config.js with v1.5 feature flags"
```

---

### Task 3: Create `js/phase.js` with tests

**Files:**
- Create: `js/phase.js`
- Create: `tests/phase.test.mjs`

A pure function that takes the matches array from `results.json` and returns `'group'` or `'knockout'`. Returns `'knockout'` only when all 72 group-stage matches have status `'finished'`. Pre-fixture states (empty matches, no group matches yet) return `'group'`.

- [ ] **Step 1: Write the failing test**

Create `tests/phase.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tournamentPhase } from '../js/phase.js';

const groupMatch = (status) => ({ stage: 'group', status });

test('empty matches array returns group', () => {
  assert.equal(tournamentPhase([]), 'group');
});

test('partial group stage (71/72 finished) returns group', () => {
  const matches = Array.from({ length: 71 }, () => groupMatch('finished'));
  matches.push(groupMatch('scheduled'));
  assert.equal(tournamentPhase(matches), 'group');
});

test('all 72 group matches finished returns knockout', () => {
  const matches = Array.from({ length: 72 }, () => groupMatch('finished'));
  assert.equal(tournamentPhase(matches), 'knockout');
});

test('72 finished group matches plus knockout fixtures still returns knockout', () => {
  const matches = [
    ...Array.from({ length: 72 }, () => groupMatch('finished')),
    { stage: 'r32', status: 'scheduled' },
    { stage: 'r32', status: 'scheduled' },
  ];
  assert.equal(tournamentPhase(matches), 'knockout');
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
node --test tests/phase.test.mjs
```

Expected: FAIL with "Cannot find module '../js/phase.js'".

- [ ] **Step 3: Write `js/phase.js`**

Create `js/phase.js`:

```js
const GROUP_STAGE_MATCH_COUNT = 72;

export function tournamentPhase(matches) {
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const allFinished = groupMatches.length === GROUP_STAGE_MATCH_COUNT
    && groupMatches.every((m) => m.status === 'finished');
  return allFinished ? 'knockout' : 'group';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
node --test tests/phase.test.mjs
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/phase.js tests/phase.test.mjs
git commit -m "feat: add tournamentPhase derivation with tests"
```

---

### Task 4: Update `isAlive` to consider R32 fixtures

**Files:**
- Modify: `js/standings.js:41-63`
- Modify: `tests/standings.test.mjs` (add cases)

The existing `isAlive` approximates "third place = eliminated", which was correct for v1's group-stage-only horizon. The 2026 format admits 8 best 3rd-placed teams to R32. Once R32 fixtures are published in `results.json`, those fixtures are the authoritative source of "who's in the knockouts." When R32 fixtures exist, a team is alive iff (a) it appears in an R32 fixture AND (b) it hasn't lost a finished knockout match.

When R32 fixtures don't exist yet (pre-publication), keep the existing top-2 approximation — it's wrong for 8 teams for at most a few hours.

- [ ] **Step 1: Add failing test cases**

Append to `tests/standings.test.mjs` (verify the file ends with a newline first; if not, add one):

```js
test('isAlive: team in R32 fixture is alive even if 3rd in group', () => {
  const teams = [
    { code: 'CZE', group: 'A' }, { code: 'KOR', group: 'A' },
    { code: 'MEX', group: 'A' }, { code: 'RSA', group: 'A' },
  ];
  const groupFinished = [
    { stage: 'group', group: 'A', status: 'finished', home: 'MEX', away: 'CZE', homeScore: 2, awayScore: 0 },
    { stage: 'group', group: 'A', status: 'finished', home: 'KOR', away: 'RSA', homeScore: 1, awayScore: 0 },
    { stage: 'group', group: 'A', status: 'finished', home: 'MEX', away: 'KOR', homeScore: 1, awayScore: 1 },
    { stage: 'group', group: 'A', status: 'finished', home: 'CZE', away: 'RSA', homeScore: 2, awayScore: 1 },
    { stage: 'group', group: 'A', status: 'finished', home: 'MEX', away: 'RSA', homeScore: 3, awayScore: 0 },
    { stage: 'group', group: 'A', status: 'finished', home: 'KOR', away: 'CZE', homeScore: 1, awayScore: 0 },
  ];
  // CZE finishes 3rd (3 points). MEX & KOR are top 2. RSA bottom.
  // R32 fixture promotes CZE as a wildcard.
  const r32 = [
    { stage: 'r32', status: 'scheduled', home: 'BRA', away: 'CZE' },
  ];
  const matches = [...groupFinished, ...r32];
  assert.equal(isAlive('CZE', teams, matches), true, 'CZE survives via wildcard');
  assert.equal(isAlive('RSA', teams, matches), false, 'RSA out (not in R32)');
});

test('isAlive: team eliminated in knockout match returns false even if in later fixture', () => {
  const teams = [{ code: 'ESP', group: 'H' }, { code: 'URU', group: 'H' }];
  const matches = [
    { stage: 'r32', status: 'finished', home: 'ESP', away: 'URU', homeScore: 2, awayScore: 1 },
    { stage: 'r16', status: 'scheduled', home: 'ESP', away: 'TBD' },
  ];
  assert.equal(isAlive('URU', teams, matches), false);
  assert.equal(isAlive('ESP', teams, matches), true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node --test tests/standings.test.mjs
```

Expected: the two new tests FAIL (existing isAlive returns the wrong answer for CZE). The original standings tests should still pass.

- [ ] **Step 3: Rewrite `isAlive` to use R32 fixtures when present**

In `js/standings.js`, replace lines 41-63 (the entire `isAlive` function) with:

```js
export function isAlive(teamCode, teams, matches) {
  const team = teams.find((t) => t.code === teamCode);
  if (!team) return false;

  // Knockout: any finished knockout match where this team lost → eliminated.
  for (const m of matches) {
    if (!KNOCKOUT_STAGES.has(m.stage)) continue;
    if (m.status !== 'finished') continue;
    if (m.home === teamCode && m.homeScore < m.awayScore) return false;
    if (m.away === teamCode && m.awayScore < m.homeScore) return false;
  }

  // If R32 fixtures exist, they're authoritative for knockout participation.
  // A team is alive iff it appears in an R32 fixture (and hasn't lost above).
  const r32Fixtures = matches.filter((m) => m.stage === 'r32');
  if (r32Fixtures.length > 0) {
    return r32Fixtures.some((m) => m.home === teamCode || m.away === teamCode);
  }

  // No R32 fixtures yet — fall back to group-stage progression rules.
  const groupFinished = matches.filter(
    (m) => m.stage === 'group' && m.group === team.group && m.status === 'finished'
  );
  const teamMatchesPlayed = groupFinished.filter((m) => m.home === teamCode || m.away === teamCode).length;
  if (teamMatchesPlayed < 3) return true;

  const table = computeStandings(team.group, teams, matches);
  const rank = table.findIndex((r) => r.code === teamCode);
  return rank < 2; // top 2 approximation — only used in the brief window before R32 fixtures land
}
```

- [ ] **Step 4: Run the full test suite to verify everything passes**

```bash
node --test tests/*.mjs
```

Expected: all standings tests + the two new ones pass. Phase tests pass.

- [ ] **Step 5: Commit**

```bash
git add js/standings.js tests/standings.test.mjs
git commit -m "feat: isAlive defers to R32 fixtures when present"
```

---

### Task 5: Refactor `render/album.js` — split group view from Heat Check

**Files:**
- Modify: `js/render/album.js`

Split the single `renderAlbum` into two top-level renderers: `renderAlbumGroup` (today's 2-col layout) and `renderAlbumHeat` (post-group-stage 3-col single-line layout, re-sorted by alive count). Keep the original `renderAlbum` export as a thin dispatcher so `app.js` doesn't need to know about the split if a feature flag is off.

This task is layout-only — clickable owner cards (Feature D) come in Task 11.

- [ ] **Step 1: Replace the contents of `js/render/album.js`**

Overwrite `js/render/album.js` with:

```js
import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { escape } from '../utils.js';

export function renderAlbumGroup(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Who owns what</h3>`;

  const grid = document.createElement('div');
  grid.className = 'pn-owners';

  for (const owner of owners.owners ?? []) {
    grid.appendChild(renderOwnerCardGroup(owner, teams, results.matches ?? []));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

export function renderAlbumHeat(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Heat Check</h3>`;

  const ordered = [...(owners.owners ?? [])].map((o, i) => ({
    owner: o,
    aliveCount: (o.teams ?? []).filter((c) => isAlive(c, teams, results.matches ?? [])).length,
    drawOrder: i,
  }));
  ordered.sort((a, b) => b.aliveCount - a.aliveCount || a.drawOrder - b.drawOrder);

  const grid = document.createElement('div');
  grid.className = 'pn-owners heat';

  for (const { owner, aliveCount } of ordered) {
    grid.appendChild(renderOwnerCardHeat(owner, aliveCount, teams, results.matches ?? []));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

function renderOwnerCardGroup(owner, teams, matches) {
  const card = document.createElement('div');
  card.className = 'pn-owner';

  const aliveCount = (owner.teams ?? []).filter((c) => isAlive(c, teams, matches)).length;
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches))
    .join('');

  card.innerHTML = `
    <div class="pn-owner-name">
      <span>${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `;
  return card;
}

function renderOwnerCardHeat(owner, aliveCount, teams, matches) {
  const card = document.createElement('div');
  card.className = 'pn-owner';
  if (aliveCount === 0) card.classList.add('zero-alive');

  const heatPrefix = aliveCount > 0 ? '🔥 ' : '';
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches))
    .join('');

  card.innerHTML = `
    <div class="pn-owner-name">
      <span>${heatPrefix}${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} / 8 alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `;
  return card;
}

function stickerHtml(code, teams, matches) {
  const t = teamByCode(teams, code);
  if (!t) return `<div class="pn-sticker out"><span class="flag">❓</span><span class="code">${escape(code)}</span></div>`;
  const outCls = isAlive(code, teams, matches) ? '' : ' out';
  return `<div class="pn-sticker${outCls}" title="${escape(t.name)}"><span class="flag">${t.flag}</span><span class="code">${escape(t.code)}</span></div>`;
}

// Back-compat: legacy single-entry export kept for any caller not yet phase-aware.
export const renderAlbum = renderAlbumGroup;
```

- [ ] **Step 2: Run existing tests**

```bash
node --test tests/*.mjs
```

Expected: all tests still pass (none directly test album.js but standings/tz/phase tests should remain green).

- [ ] **Step 3: Commit**

```bash
git add js/render/album.js
git commit -m "refactor: split renderAlbum into renderAlbumGroup + renderAlbumHeat"
```

---

### Task 6: Add Heat Check CSS

**Files:**
- Modify: `css/styles.css`

Append a labelled CSS section for the 3-col Heat Check layout. Tokens (--paper, --ink, --maroon, etc.) are reused from `:root`. Stickers shrink to 30×38 inside `.heat` so 8 fit single-line.

- [ ] **Step 1: Append the section to the end of `css/styles.css`**

Add at the bottom of `css/styles.css`:

```css

/* ---------- Heat Check (transformed album) ---------- */
.pn-owners.heat {
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.pn-owners.heat .pn-owner {
  padding: 10px 12px;
  position: relative;
}
.pn-owners.heat .pn-owner.zero-alive .pn-owner-name > span:first-child {
  text-decoration: line-through;
  opacity: 0.6;
  color: var(--dead);
}
.pn-owners.heat .pn-stickers {
  flex-wrap: nowrap;
  justify-content: space-between;
  gap: 3px;
}
.pn-owners.heat .pn-sticker {
  width: 30px;
  height: 38px;
}
.pn-owners.heat .pn-sticker .flag { font-size: 14px; }
.pn-owners.heat .pn-sticker .code { font-size: 7px; }
@media (max-width: 700px) {
  .pn-owners.heat { grid-template-columns: 1fr; }
  .pn-owners.heat .pn-stickers { flex-wrap: wrap; }
  .pn-owners.heat .pn-sticker { width: 34px; height: 44px; }
  .pn-owners.heat .pn-sticker .flag { font-size: 16px; }
  .pn-owners.heat .pn-sticker .code { font-size: 8px; }
}
```

- [ ] **Step 2: Verify the file still parses (no JS test, just visual / syntactic)**

```bash
node -e "const c = require('fs').readFileSync('css/styles.css','utf8'); if (c.split('{').length !== c.split('}').length) throw new Error('brace mismatch'); console.log('balanced');"
```

Expected output: `balanced`.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add Heat Check CSS section"
```

---

### Task 7: Wire `app.js` to dispatch Album on phase + flag

**Files:**
- Modify: `js/app.js`

`app.js` becomes aware of the phase and the `transformAlbum` flag. When `phase === 'knockout'` and the flag is on, it calls `renderAlbumHeat`; otherwise `renderAlbumGroup`. Old `renderAlbum` import is replaced.

- [ ] **Step 1: Update imports and the dispatcher**

In `js/app.js`, replace the imports at the top with:

```js
import { loadAll } from './data.js';
import { renderHeader }         from './render/header.js';
import { renderCover }          from './render/cover.js';
import { renderStatus }         from './render/status.js';
import { renderAlbumGroup, renderAlbumHeat } from './render/album.js';
import { renderLatestResults }  from './render/results.js';
import { renderUpcoming }       from './render/upcoming.js';
import { renderFooter }         from './render/footer.js';
import { fetchLiveMatches, mergeLive } from './live.js';
import { FEATURES } from './config.js';
import { tournamentPhase } from './phase.js';
```

(Note: `escapeHtml` was already removed by the extract-shared-utils plan — the import for `escape` from `utils.js` should be present. If you find a local `escapeHtml` still in `app.js`, the prerequisite plan hasn't been run; stop and run it first.)

- [ ] **Step 2: Update the `paint` function to dispatch**

Replace the `paint` function (currently lines ~32-48) with:

```js
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
    renderLatestResults(root, state, now);
    renderUpcoming(root, state, now);
  }
  renderFooter(root, state, now);
}
```

- [ ] **Step 3: Run tests, verify nothing broke**

```bash
node --test tests/*.mjs
```

Expected: all tests pass.

- [ ] **Step 4: Smoke-test in browser**

Start a local server:

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/ — dashboard should render exactly as before (group phase). Stop the server when done: `kill %1`.

- [ ] **Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: dispatch Album to Heat Check based on phase + flag"
```

---

### Task 8: Create `render/standings-section.js`

**Files:**
- Create: `js/render/standings-section.js`

Renders the new collapsible section containing 12 mini group tables. Uses `computeStandings()` from `standings.js`. Persists collapsed state in `localStorage` under key `sweep26.standingsOpen`.

- [ ] **Step 1: Create the module**

Create `js/render/standings-section.js`:

```js
import { computeStandings } from '../standings.js';
import { teamByCode } from '../data.js';
import { escape, flag } from '../utils.js';

const STORAGE_KEY = 'sweep26.standingsOpen';
const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];

export function renderStandingsSection(container, { teams, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section pn-standings';

  const isOpen = readOpen();
  if (!isOpen) section.classList.add('collapsed');

  section.innerHTML = `
    <h3>Group Standings</h3>
    <button type="button" class="pn-standings-toggle">${toggleLabel(isOpen)}</button>
    <div class="pn-standings-grid">${gridHtml(teams, results.matches ?? [])}</div>
  `;

  const btn = section.querySelector('.pn-standings-toggle');
  btn.addEventListener('click', () => {
    const nowOpen = section.classList.contains('collapsed');
    section.classList.toggle('collapsed', !nowOpen);
    btn.textContent = toggleLabel(nowOpen);
    writeOpen(nowOpen);
  });

  container.appendChild(section);
}

function gridHtml(teams, matches) {
  return GROUP_CODES.map((g) => groupCardHtml(g, teams, matches)).join('');
}

function groupCardHtml(groupCode, teams, matches) {
  const table = computeStandings(groupCode, teams, matches);
  const allFinished = matches
    .filter((m) => m.stage === 'group' && m.group === groupCode)
    .every((m) => m.status === 'finished');

  const rows = table.map((row, i) => {
    const t = teamByCode(teams, row.code);
    const mark = allFinished ? (i < 2 ? '<span class="qmk">✓</span>' : '<span class="xmk">✗</span>') : '';
    const rowCls = allFinished && i >= 2 ? ' class="elim-row"' : '';
    return `
      <tr${rowCls}>
        <td class="qcol">${mark}</td>
        <td class="tcol">
          <span class="pn-sticker mini"><span class="flag">${flag(t)}</span><span class="code">${escape(row.code)}</span></span>
          ${escape(t?.name ?? row.code)}
        </td>
        <td>${row.played}</td>
        <td>${formatGd(row.gd)}</td>
        <td><b>${row.points}</b></td>
      </tr>
    `;
  }).join('');

  return `
    <div class="pn-group-card">
      <div class="pn-group-title">Group ${escape(groupCode)}</div>
      <table class="pn-group-tbl">
        <thead><tr><th></th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function formatGd(gd) {
  if (gd > 0) return `+${gd}`;
  if (gd < 0) return `−${Math.abs(gd)}`;
  return '0';
}

function toggleLabel(isOpen) {
  return isOpen ? '▾ Hide group standings' : '▸ Show group standings';
}

function readOpen() {
  try { return globalThis.localStorage?.getItem(STORAGE_KEY) === 'true'; }
  catch { return false; }
}
function writeOpen(open) {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, String(open)); }
  catch { /* private mode etc — ignore */ }
}
```

- [ ] **Step 2: Verify the module parses**

```bash
node -e "import('./js/render/standings-section.js').then(m => console.log(Object.keys(m)))"
```

Expected output: `[ 'renderStandingsSection' ]`.

- [ ] **Step 3: Commit**

```bash
git add js/render/standings-section.js
git commit -m "feat: add group standings section renderer"
```

---

### Task 9: Add Group Standings CSS

**Files:**
- Modify: `css/styles.css`

Append CSS for the standings section. Uses existing tokens. Toggle button is gold + black border, matching the draw page's primary button.

- [ ] **Step 1: Append the section to the end of `css/styles.css`**

Add at the bottom of `css/styles.css`:

```css

/* ---------- Group standings ---------- */
.pn-standings-toggle {
  background: var(--gold);
  border: 2px solid var(--ink);
  border-radius: var(--radius);
  box-shadow: 2px 2px 0 var(--ink);
  padding: 6px 12px;
  font: inherit;
  font-weight: 800;
  font-size: 11px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.pn-standings-toggle:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--ink); }
.pn-standings.collapsed .pn-standings-grid { display: none; }
.pn-standings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
@media (max-width: 700px) { .pn-standings-grid { grid-template-columns: 1fr; } }
.pn-group-card {
  background: var(--paper-bright);
  border: 1px solid var(--paper-edge);
  border-radius: var(--radius);
  padding: 6px 8px;
}
.pn-group-title {
  font-style: italic;
  color: var(--maroon);
  font-weight: 900;
  font-size: 11px;
  margin-bottom: 3px;
}
.pn-group-tbl { width: 100%; font-size: 10px; border-collapse: collapse; }
.pn-group-tbl th {
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--maroon);
  text-align: right;
  padding: 2px 4px;
  border-bottom: 1px solid var(--paper-edge);
}
.pn-group-tbl th:nth-child(1), .pn-group-tbl th:nth-child(2) { text-align: left; }
.pn-group-tbl td {
  padding: 3px 4px;
  text-align: right;
  border-bottom: 1px dotted var(--paper-edge);
}
.pn-group-tbl td:nth-child(1), .pn-group-tbl td:nth-child(2) { text-align: left; }
.pn-group-tbl .qcol { width: 12px; }
.pn-group-tbl .qmk { color: var(--alive); font-weight: 800; }
.pn-group-tbl .xmk { color: var(--dead); }
.pn-group-tbl tr.elim-row td { opacity: 0.55; }
.pn-sticker.mini { width: 22px; height: 28px; vertical-align: middle; padding: 1px; margin-right: 2px; }
.pn-sticker.mini .flag { font-size: 11px; }
.pn-sticker.mini .code { font-size: 6px; }
```

- [ ] **Step 2: Verify the file still parses**

```bash
node -e "const c = require('fs').readFileSync('css/styles.css','utf8'); if (c.split('{').length !== c.split('}').length) throw new Error('brace mismatch'); console.log('balanced');"
```

Expected output: `balanced`.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add group standings CSS section"
```

---

### Task 10: Wire `app.js` to render standings section

**Files:**
- Modify: `js/app.js`

Insert the standings section between Album and Latest Results. Gated by `FEATURES.groupStandings`.

- [ ] **Step 1: Add the import**

In `js/app.js`, add to the imports near the other `render/*` imports:

```js
import { renderStandingsSection } from './render/standings-section.js';
```

- [ ] **Step 2: Insert the renderer call in `paint`**

Inside the `else` branch of `paint`, between the Album dispatch and `renderLatestResults`, insert:

```js
    if (FEATURES.groupStandings) {
      renderStandingsSection(root, state);
    }
```

The full `else` block should now read:

```js
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
```

- [ ] **Step 3: Run tests + smoke-test in browser**

```bash
node --test tests/*.mjs
python3 -m http.server 8000 &
```

Open http://localhost:8000/ — confirm:
- Standings section appears between Album and Latest Results
- Clicking "Show group standings" reveals 12 group cards
- Reloading the page preserves the open/closed state
- Console has no errors

Stop the server: `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: render group standings section on dashboard"
```

---

### Task 11: Make owner cards clickable in `render/album.js`

**Files:**
- Modify: `js/render/album.js`

When `FEATURES.ownerDetail` is on, owner cards become anchor tags linking to `/owner.html?name=<name>`. A chevron `›` renders in the top-right of each card. Applies to both `renderAlbumGroup` and `renderAlbumHeat`.

- [ ] **Step 1: Import the flag at the top of `js/render/album.js`**

Add to the imports at the top:

```js
import { FEATURES } from '../config.js';
```

- [ ] **Step 2: Add a helper that wraps a card in an anchor when the flag is on**

Add this helper just below the imports:

```js
function ownerCardWrapper(owner) {
  if (!FEATURES.ownerDetail) {
    const div = document.createElement('div');
    div.className = 'pn-owner';
    return div;
  }
  const a = document.createElement('a');
  a.className = 'pn-owner clickable';
  a.href = `owner.html?name=${encodeURIComponent(owner.name)}`;
  a.innerHTML = `<span class="pn-chev">›</span>`;
  return a;
}
```

- [ ] **Step 3: Update both card renderers to use the wrapper**

Replace `renderOwnerCardGroup` with:

```js
function renderOwnerCardGroup(owner, teams, matches) {
  const card = ownerCardWrapper(owner);

  const aliveCount = (owner.teams ?? []).filter((c) => isAlive(c, teams, matches)).length;
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches))
    .join('');

  card.insertAdjacentHTML('beforeend', `
    <div class="pn-owner-name">
      <span>${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `);
  return card;
}
```

Replace `renderOwnerCardHeat` with:

```js
function renderOwnerCardHeat(owner, aliveCount, teams, matches) {
  const card = ownerCardWrapper(owner);
  if (aliveCount === 0) card.classList.add('zero-alive');

  const heatPrefix = aliveCount > 0 ? '🔥 ' : '';
  const aliveCls = aliveCount > 0 ? 'pn-owner-alive' : 'pn-owner-out';

  const stickersHtml = (owner.teams ?? [])
    .map((code) => stickerHtml(code, teams, matches))
    .join('');

  card.insertAdjacentHTML('beforeend', `
    <div class="pn-owner-name">
      <span>${heatPrefix}${escape(owner.name)}</span>
      <span class="${aliveCls}">${aliveCount} / 8 alive</span>
    </div>
    <div class="pn-stickers">${stickersHtml}</div>
  `);
  return card;
}
```

- [ ] **Step 4: Add CSS for the clickable card + chevron**

Append to `css/styles.css`:

```css

/* ---------- Owner card clickable ---------- */
.pn-owner.clickable {
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
}
.pn-owner.clickable:hover {
  transform: translate(-1px, -1px);
  box-shadow: 2px 2px 0 var(--ink);
  border-color: var(--ink);
}
.pn-owner .pn-chev {
  position: absolute;
  top: 8px;
  right: 10px;
  color: var(--maroon);
  opacity: 0.35;
  font-size: 12px;
  font-weight: 900;
}
.pn-owner.clickable:hover .pn-chev { opacity: 1; }
```

- [ ] **Step 5: Smoke test**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/ — owner cards should now show a chevron in the top-right; hovering one should lift it; clicking should navigate to `owner.html?name=...` (which 404s for now — that's OK, Task 12 builds the page). Console: no errors.

Stop the server: `kill %1`.

- [ ] **Step 6: Commit**

```bash
git add js/render/album.js css/styles.css
git commit -m "feat: clickable owner cards link to owner detail page"
```

---

### Task 12: Create owner detail page (`owner.html` + bootstrap + renderer)

**Files:**
- Create: `owner.html`
- Create: `js/owner.js`
- Create: `js/render/owner-detail.js`

The owner detail page reuses the dashboard's header. It parses `?name=` from the URL, finds the owner in `owners.json`, and renders each of their 8 teams with W/D/L record, GD, and either a "next match" or an "eliminated" annotation.

- [ ] **Step 1: Create the HTML shell**

Create `owner.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Owner · 2026 Sweepstake</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main class="pn" id="owner">
    <p class="loading">Loading…</p>
  </main>
  <script type="module" src="js/owner.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the bootstrap**

Create `js/owner.js`:

```js
import { loadAll } from './data.js';
import { renderHeader } from './render/header.js';
import { renderOwnerDetail } from './render/owner-detail.js';
import { escape } from './utils.js';

async function main() {
  const root = document.getElementById('owner');
  const params = new URLSearchParams(location.search);
  const name = params.get('name');

  if (!name) {
    renderHeader(root);
    renderNotFound(root, 'No owner specified.');
    return;
  }

  let state;
  try {
    state = await loadAll();
  } catch (err) {
    root.innerHTML = `<p class="error">Couldn't load tournament data — ${escape(err.message)}</p>`;
    return;
  }

  const owner = (state.owners?.owners ?? []).find((o) => o.name === name);
  root.innerHTML = '';
  renderHeader(root);
  if (!owner) {
    renderNotFound(root, `No owner named "${name}".`);
    return;
  }
  renderOwnerDetail(root, state, owner);
  window.addEventListener('tz-change', () => {
    root.innerHTML = '';
    renderHeader(root);
    renderOwnerDetail(root, state, owner);
  });
}

function renderNotFound(root, message) {
  const card = document.createElement('div');
  card.className = 'pn-empty';
  card.innerHTML = `${escape(message)} <a href="index.html">Back to the album</a>.`;
  root.appendChild(card);
}

main();
```

- [ ] **Step 3: Create the renderer**

Create `js/render/owner-detail.js`:

```js
import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { formatMatchDateTime } from '../tz.js';
import { escape, flag } from '../utils.js';

const KNOCKOUT_LABEL = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final' };

export function renderOwnerDetail(container, { teams, results }, owner) {
  const matches = results?.matches ?? [];

  const teamRows = (owner.teams ?? []).map((code) => ({
    code,
    team: teamByCode(teams, code),
    alive: isAlive(code, teams, matches),
    record: computeRecord(code, matches),
    next: nextFixture(code, matches, teams),
  }));

  teamRows.sort((a, b) => Number(b.alive) - Number(a.alive));
  const aliveCount = teamRows.filter((r) => r.alive).length;

  const cover = document.createElement('section');
  cover.className = 'pn-cover';
  cover.innerHTML = `
    <p class="back-link"><a href="index.html">← Back to the album</a></p>
    <h1 class="pn-title">${escape(owner.name)}</h1>
    <div class="pn-subtitle">${aliveCount} of ${teamRows.length} alive</div>
  `;
  container.appendChild(cover);

  const list = document.createElement('section');
  list.className = 'pn-section owner-team-list';
  list.innerHTML = teamRows.map(rowHtml).join('');
  container.appendChild(list);
}

function rowHtml({ code, team, alive, record, next }) {
  const cls = alive ? 'owner-team-row' : 'owner-team-row out';
  const stickerCls = alive ? 'pn-sticker' : 'pn-sticker out';
  const name = team?.name ?? code;
  const flagChar = flag(team);
  return `
    <div class="${cls}">
      <span class="${stickerCls}"><span class="flag">${flagChar}</span><span class="code">${escape(code)}</span></span>
      <span class="t-name">${escape(name)}</span>
      <span class="t-rec">${record.w}W ${record.d}D ${record.l}L · ${formatGd(record.gd)} GD</span>
      <span class="t-next">${next}</span>
    </div>
  `;
}

function computeRecord(teamCode, matches) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    if (m.home !== teamCode && m.away !== teamCode) continue;
    const isHome = m.home === teamCode;
    const my = isHome ? m.homeScore : m.awayScore;
    const opp = isHome ? m.awayScore : m.homeScore;
    gf += my; ga += opp;
    if (my > opp) w += 1;
    else if (my < opp) l += 1;
    else d += 1;
  }
  return { w, d, l, gd: gf - ga };
}

function nextFixture(teamCode, matches, teams) {
  const upcoming = matches
    .filter((m) => m.status !== 'finished')
    .filter((m) => m.home === teamCode || m.away === teamCode)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  if (upcoming.length === 0) {
    // Either eliminated or all their matches are done — figure out which.
    const playedAny = matches.some((m) =>
      m.status === 'finished' && (m.home === teamCode || m.away === teamCode));
    return playedAny ? 'eliminated' : 'awaiting fixtures';
  }

  const next = upcoming[0];
  const oppCode = next.home === teamCode ? next.away : next.home;
  const oppTeam = teamByCode(teams, oppCode);
  const oppLabel = oppTeam?.code ?? oppCode;
  const stageLabel = next.stage === 'group' ? `Group ${escape(next.group ?? '?')}` : (KNOCKOUT_LABEL[next.stage] ?? next.stage);
  return `→ vs ${escape(oppLabel)} · ${stageLabel} · ${formatMatchDateTime(next.kickoff)}`;
}

function formatGd(gd) {
  if (gd > 0) return `+${gd}`;
  if (gd < 0) return `−${Math.abs(gd)}`;
  return '0';
}
```

- [ ] **Step 4: Smoke-test the page**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/owner.html?name=Owner%201 (use whatever owner name exists in your `data/owners.json`). You should see:
- Header with TZ toggle
- Cover with owner name + alive count
- One row per team, alive teams on top, with records and next-fixture annotations
- Back link to dashboard

Also try http://localhost:8000/owner.html?name=Nobody — should show "No owner named 'Nobody'" with a back link.

Stop the server: `kill %1`.

- [ ] **Step 5: Commit**

```bash
git add owner.html js/owner.js js/render/owner-detail.js
git commit -m "feat: per-owner detail page"
```

---

### Task 13: Add Owner Detail CSS

**Files:**
- Modify: `css/styles.css`

Append CSS for the team list rows and the back link. Mobile reflow stacks the record + next-match below the team name.

- [ ] **Step 1: Append the section to the end of `css/styles.css`**

Add at the bottom of `css/styles.css`:

```css

/* ---------- Owner detail ---------- */
.back-link {
  font-size: 11px;
  margin: 0 0 10px;
  text-align: left;
}
.back-link a {
  color: var(--maroon);
  text-decoration: underline;
  font-style: italic;
}
.owner-team-list { display: flex; flex-direction: column; gap: 0; }
.owner-team-row {
  display: grid;
  grid-template-columns: 44px 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 6px 4px;
  border-bottom: 1px dotted var(--paper-edge);
  font-size: 12px;
}
.owner-team-row:last-child { border-bottom: none; }
.owner-team-row.out { opacity: 0.55; }
.owner-team-row .t-name { font-weight: 700; }
.owner-team-row .t-rec { font-size: 10px; color: var(--alive); font-weight: 700; }
.owner-team-row.out .t-rec { color: var(--dead); }
.owner-team-row .t-next { font-size: 10px; font-style: italic; opacity: 0.75; text-align: right; }
@media (max-width: 700px) {
  .owner-team-row {
    grid-template-columns: 44px 1fr;
    grid-template-rows: auto auto;
  }
  .owner-team-row .t-rec { grid-column: 2; grid-row: 2; text-align: left; }
  .owner-team-row .t-next { grid-column: 1 / -1; grid-row: 3; text-align: left; padding-left: 54px; }
}
```

- [ ] **Step 2: Verify the file still parses**

```bash
node -e "const c = require('fs').readFileSync('css/styles.css','utf8'); if (c.split('{').length !== c.split('}').length) throw new Error('brace mismatch'); console.log('balanced');"
```

Expected output: `balanced`.

- [ ] **Step 3: Smoke-test the owner page styling**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/owner.html?name=Owner%201 and confirm the rows are styled per the mockup. Resize the browser narrow (< 700px) and confirm rows reflow to stacked.

Stop the server: `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "feat: add owner detail page CSS"
```

---

### Task 14: Implement `render/bracket-render.js`

**Files:**
- Create: `js/render/bracket-render.js`

The bracket renderer (created first so Task 15's bootstrap can import it without leaving the repo broken between commits). Five columns of cells (R32 → Final) plus the third-place playoff as a sixth trailing column. Each cell shows both teams with owner tags + scores. Connecting lines come in Task 16 (CSS pseudo-elements).

- [ ] **Step 1: Create the renderer**

Create `js/render/bracket-render.js`:

```js
import { teamByCode, ownerForTeam } from '../data.js';
import { formatMatchDateTime } from '../tz.js';
import { escape, ownerTag, flag } from '../utils.js';

const ROUNDS = [
  { key: 'r32',   label: 'Round of 32' },
  { key: 'r16',   label: 'Round of 16' },
  { key: 'qf',    label: 'Quarter-Finals' },
  { key: 'sf',    label: 'Semi-Finals' },
  { key: 'final', label: 'Final' },
];

export function renderBracket(container, { teams, owners, results }) {
  const matches = results?.matches ?? [];
  const ownersList = owners?.owners ?? [];

  // Tabs (visible only on mobile via CSS)
  const tabs = document.createElement('div');
  tabs.className = 'br-tabs';
  tabs.innerHTML = ROUNDS.map((r, i) =>
    `<button type="button" class="br-tab${i === 0 ? ' active' : ''}" data-target="${r.key}">${escape(r.label.split(' ').pop())}</button>`
  ).join('') + `<button type="button" class="br-tab" data-target="third">3rd</button>`;
  container.appendChild(tabs);

  // Scroll-snap container (becomes a swipeable carousel on mobile via CSS)
  const scroller = document.createElement('div');
  scroller.className = 'br-scroll';

  for (const r of ROUNDS) {
    scroller.appendChild(renderRound(r, matches, teams, ownersList));
  }
  scroller.appendChild(renderThirdPlace(matches, teams, ownersList));

  container.appendChild(scroller);

  wireTabs(tabs, scroller);
}

function renderRound({ key, label }, allMatches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'br-round';
  section.dataset.round = key;

  const cells = allMatches
    .filter((m) => m.stage === key)
    .sort((a, b) => (a.kickoff ?? '').localeCompare(b.kickoff ?? ''));

  section.innerHTML = `
    <div class="br-round-label">${escape(label)}</div>
    <div class="br-cells">
      ${cells.length === 0
        ? '<div class="br-empty">TBD</div>'
        : cells.map((m) => cellHtml(m, teams, ownersList)).join('')}
    </div>
  `;
  return section;
}

function renderThirdPlace(allMatches, teams, ownersList) {
  const section = document.createElement('section');
  section.className = 'br-round br-third';
  section.dataset.round = 'third';

  const m = allMatches.find((x) => x.stage === 'third');
  section.innerHTML = `
    <div class="br-round-label">3rd place</div>
    <div class="br-cells">
      ${m ? cellHtml(m, teams, ownersList) : '<div class="br-empty">TBD</div>'}
    </div>
  `;
  return section;
}

function cellHtml(m, teams, ownersList) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(ownersList, m.home);
  const awayOwner = ownerForTeam(ownersList, m.away);

  const finished = m.status === 'finished';
  const homeLost = finished && m.homeScore < m.awayScore;
  const awayLost = finished && m.awayScore < m.homeScore;

  const homeScore = m.homeScore ?? '';
  const awayScore = m.awayScore ?? '';
  const when = finished
    ? `${formatMatchDateTime(m.kickoff)} · finished`
    : (m.kickoff ? formatMatchDateTime(m.kickoff) : 'TBD');

  return `
    <div class="br-cell">
      <div class="br-team${homeLost ? ' lost' : ''}">
        <span class="pn-sticker"><span class="flag">${flag(home)}</span><span class="code">${escape(m.home ?? '?')}</span></span>
        <span class="br-name">${escape(home?.name ?? m.home ?? 'TBD')}</span>
        ${ownerTag(homeOwner)}
        <span class="br-sc">${escape(String(homeScore))}</span>
      </div>
      <div class="br-team${awayLost ? ' lost' : ''}">
        <span class="pn-sticker"><span class="flag">${flag(away)}</span><span class="code">${escape(m.away ?? '?')}</span></span>
        <span class="br-name">${escape(away?.name ?? m.away ?? 'TBD')}</span>
        ${ownerTag(awayOwner)}
        <span class="br-sc">${escape(String(awayScore))}</span>
      </div>
      <div class="br-when">${when}</div>
    </div>
  `;
}

function wireTabs(tabs, scroller) {
  const buttons = [...tabs.querySelectorAll('.br-tab')];
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = scroller.querySelector(`.br-round[data-round="${btn.dataset.target}"]`);
      target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
  });

  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const round = visible.target.dataset.round;
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.target === round));
  }, { root: scroller, threshold: 0.6 });

  for (const round of scroller.querySelectorAll('.br-round')) io.observe(round);
}
```

- [ ] **Step 2: Verify the module parses**

```bash
node -e "import('./js/render/bracket-render.js').then(m => console.log(Object.keys(m)))"
```

Expected output: `[ 'renderBracket' ]`.

- [ ] **Step 3: Commit**

```bash
git add js/render/bracket-render.js
git commit -m "feat: bracket renderer with 5 rounds + third-place column"
```

---

### Task 15: Create bracket page shell (`bracket.html` + bootstrap)

**Files:**
- Create: `bracket.html`
- Create: `js/bracket.js`

The bracket page shell. Loads tournament data and dispatches to either the pre-knockout empty-state card or the renderer (Task 14). Reuses the dashboard header (TZ toggle remains).

- [ ] **Step 1: Create the HTML shell**

Create `bracket.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bracket · 2026 Sweepstake</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main class="pn" id="bracket">
    <p class="loading">Loading…</p>
  </main>
  <script type="module" src="js/bracket.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the bootstrap**

Create `js/bracket.js`:

```js
import { loadAll } from './data.js';
import { renderHeader } from './render/header.js';
import { renderBracket } from './render/bracket-render.js';
import { tournamentPhase } from './phase.js';
import { escape } from './utils.js';

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
  window.addEventListener('tz-change', () => paint(root, state));
}

function paint(root, state) {
  root.innerHTML = '';
  renderHeader(root);

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
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0];
  const when = firstR32?.kickoff
    ? `First R32 match: ${escape(firstR32.kickoff)}`
    : 'R32 fixtures will appear here when published.';
  const card = document.createElement('div');
  card.className = 'pn-empty';
  card.innerHTML = `The knockouts haven't started yet. ${when}<br/><a href="index.html">← Back to the album</a>`;
  root.appendChild(card);
}

main();
```

- [ ] **Step 3: Smoke-test (expect the "not started" card)**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/bracket.html — should show "The knockouts haven't started yet" with a back link. No console errors. (The bracket renderer is imported but not invoked in this state — that's verified in Task 19 with stubbed knockout data.)

Stop the server: `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add bracket.html js/bracket.js
git commit -m "feat: bracket page shell with pre-knockout empty state"
```

---

### Task 16: Add Bracket desktop CSS (with connecting lines)

**Files:**
- Modify: `css/styles.css`

Append the bracket CSS section. Desktop: 6 columns (R32 R16 QF SF Final 3rd) with the 3rd column visually separated by a wider gap. Connecting lines between rounds are drawn with `::after` pseudo-elements on each cell — a thin horizontal stroke extending to the right.

- [ ] **Step 1: Append the section to `css/styles.css`**

```css

/* ---------- Bracket ---------- */
.br-tabs { display: none; }
.br-scroll {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 0.05fr 1fr;
  gap: 12px;
  align-items: stretch;
  margin-top: 16px;
}
.br-scroll::before {
  /* phantom column gives space between Final and 3rd-place */
  content: '';
  grid-column: 6;
}
.br-round {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 8px;
}
.br-round.br-third { grid-column: 7; justify-content: flex-end; padding-bottom: 8px; }
.br-round-label {
  font-style: italic;
  color: var(--maroon);
  font-weight: 900;
  font-size: 11px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 4px;
}
.br-cells { display: flex; flex-direction: column; justify-content: space-around; gap: 8px; flex: 1; }
.br-empty {
  background: var(--paper-bright);
  border: 1px dashed var(--paper-edge);
  border-radius: var(--radius);
  padding: 16px 8px;
  text-align: center;
  font-style: italic;
  opacity: 0.6;
  font-size: 11px;
}
.br-cell {
  background: var(--paper-bright);
  border: 1.5px solid var(--ink);
  border-radius: var(--radius);
  box-shadow: 1.5px 1.5px 0 var(--ink);
  padding: 6px 8px;
  font-size: 11px;
  position: relative;
}
.br-team {
  display: grid;
  grid-template-columns: 26px 1fr auto auto;
  gap: 6px;
  align-items: center;
  padding: 2px 0;
}
.br-team.lost { opacity: 0.45; text-decoration: line-through; }
.br-team .pn-sticker { width: 22px; height: 28px; padding: 1px; }
.br-team .pn-sticker .flag { font-size: 11px; }
.br-team .pn-sticker .code { font-size: 6px; }
.br-team .br-name { font-weight: 700; }
.br-team .br-sc { font-weight: 900; color: var(--maroon); font-size: 14px; min-width: 14px; text-align: right; }
.br-when { font-size: 9px; font-style: italic; opacity: 0.55; text-align: center; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

/* Connecting lines (desktop only) */
@media (min-width: 701px) {
  .br-round:not(:last-of-type):not(.br-third) .br-cell::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -12px;
    width: 12px;
    height: 1.5px;
    background: var(--ink);
  }
}
```

- [ ] **Step 2: Verify the file still parses**

```bash
node -e "const c = require('fs').readFileSync('css/styles.css','utf8'); if (c.split('{').length !== c.split('}').length) throw new Error('brace mismatch'); console.log('balanced');"
```

Expected output: `balanced`.

- [ ] **Step 3: Smoke-test (requires fake knockout fixtures)**

To force the bracket to render, temporarily edit `data/results.json` to add a few R32 fixtures (revert before committing). Or stub via the browser console:

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/bracket.html. Initially you'll see the "knockouts haven't started" card — that's fine. (Full visual verification happens in the smoke test at Task 19 with stubbed data.) Confirm no console errors.

Stop the server: `kill %1`.

- [ ] **Step 4: Commit**

```bash
git add css/styles.css
git commit -m "feat: bracket desktop CSS with connecting lines"
```

---

### Task 17: Add Bracket mobile CSS (scroll-snap carousel)

**Files:**
- Modify: `css/styles.css`

Below 700px the bracket becomes a swipeable carousel: tabs at the top, one round per screen, native scroll-snap.

- [ ] **Step 1: Append the mobile rules to `css/styles.css`**

```css

/* ---------- Bracket mobile (< 700px) ---------- */
@media (max-width: 700px) {
  .br-tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 4px 0 8px;
    position: sticky;
    top: 0;
    background: var(--paper);
    z-index: 2;
  }
  .br-tab {
    background: var(--paper-bright);
    border: 1px solid var(--ink);
    border-radius: 3px;
    box-shadow: 1px 1px 0 var(--ink);
    padding: 4px 8px;
    font: inherit;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
    flex-shrink: 0;
  }
  .br-tab.active {
    background: var(--gold);
    box-shadow: 0.5px 0.5px 0 var(--ink);
    transform: translate(1px, 1px);
  }
  .br-scroll {
    display: flex;
    grid-template-columns: none;
    gap: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .br-scroll::before { display: none; }
  .br-round {
    flex: 0 0 100%;
    scroll-snap-align: start;
    padding: 8px 4px;
  }
  .br-round.br-third { grid-column: auto; }
}
```

- [ ] **Step 2: Verify the file still parses**

```bash
node -e "const c = require('fs').readFileSync('css/styles.css','utf8'); if (c.split('{').length !== c.split('}').length) throw new Error('brace mismatch'); console.log('balanced');"
```

Expected output: `balanced`.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: bracket mobile scroll-snap carousel"
```

---

### Task 18: Conditionally link the bracket from the footer

**Files:**
- Modify: `js/render/footer.js`

The footer currently has a static "/bracket coming 30 June" note. Replace it with a link that only appears when `phase === 'knockout'` and `FEATURES.bracket` is on. In group phase, hide the bracket reference entirely.

- [ ] **Step 1: Rewrite `js/render/footer.js`**

Replace the entire contents of `js/render/footer.js` with:

```js
import { formatTime } from '../tz.js';
import { tournamentPhase } from '../phase.js';
import { FEATURES } from '../config.js';

export function renderFooter(container, { results }, nowIso = new Date().toISOString()) {
  const foot = document.createElement('footer');
  foot.className = 'pn-foot';

  const lastUpdated = results?.lastUpdated;
  const refreshLabel = lastUpdated
    ? `last refresh ${formatTime(lastUpdated)}`
    : 'no refresh yet';

  const phase = tournamentPhase(results?.matches ?? []);
  const bracketLink = FEATURES.bracket && phase === 'knockout'
    ? ` · <a href="bracket.html">View the bracket →</a>`
    : '';

  foot.innerHTML = `★ ${refreshLabel} · <a href="draw.html">/draw</a>${bracketLink} ★`;
  container.appendChild(foot);
}
```

- [ ] **Step 2: Smoke-test**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/ — footer should now read `★ last refresh HH:MM · /draw ★` (no bracket link during group phase). Console: no errors.

Stop the server: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add js/render/footer.js
git commit -m "feat: footer links to bracket conditionally on phase"
```

---

### Task 19: End-to-end smoke test + flag toggle verification

**Files:**
- Modify (temporarily, then revert): `data/results.json` for stub
- Modify (temporarily, then revert): `js/config.js` for flag-off probes

Final pass — confirm each feature renders correctly in both group-phase and knockout-phase states, then confirm each `FEATURES.*` flag turns its feature off cleanly.

- [ ] **Step 1: Verify group-phase behaviour (current `results.json`)**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000/. Confirm:
- Album renders as the original 2-col layout (no "Heat Check" in title)
- Group standings section appears between Album and Latest Results; expand it and confirm 12 tables render
- Owner cards are clickable; clicking opens `owner.html?name=...` correctly
- Footer reads `★ ... · /draw ★` (no bracket link)
- `/bracket.html` shows the "knockouts haven't started" card

- [ ] **Step 2: Stub a knockout-phase state**

Backup the current `data/results.json`:

```bash
cp data/results.json data/results.json.bak
```

Build a stubbed `results.json` where all 72 group matches are `finished` with plausible scores and 16 R32 fixtures exist:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/results.json.bak','utf8'));
const matches = data.matches.map((m) => m.stage === 'group' ? { ...m, status: 'finished', homeScore: 1, awayScore: 0 } : m);
const r32 = [];
for (let i = 0; i < 16; i++) r32.push({ id: 'stub-r32-' + i, kickoff: '2026-06-28T18:00:00Z', stage: 'r32', group: null, home: data.matches[i].home, away: data.matches[i].away, status: 'scheduled', homeScore: null, awayScore: null });
fs.writeFileSync('data/results.json', JSON.stringify({ lastUpdated: data.lastUpdated, matches: [...matches, ...r32] }, null, 2) + '\n');
"
```

Refresh http://localhost:8000/ and confirm:
- Album title now reads "The Album · Heat Check"
- Owners re-ordered by alive count (highest first)
- 🔥 prefix on owners with ≥ 1 alive team
- Owners with 0 alive teams are struck-through
- Footer now has `· View the bracket →`
- `/bracket.html` shows 5 columns + 3rd-place card on desktop
- Resize to < 700px and confirm bracket becomes a swipe carousel with tabs at the top

- [ ] **Step 3: Restore real `results.json`**

```bash
mv data/results.json.bak data/results.json
```

Refresh http://localhost:8000/ — confirm dashboard returns to group-phase state.

- [ ] **Step 4: Toggle each flag off and verify clean degradation**

Edit `js/config.js` and set each flag to `false` in turn, refresh the dashboard, confirm:

| Flag | Off behaviour |
|---|---|
| `bracket: false` | Footer never shows bracket link (even with stubbed knockout data). `/bracket.html` still works directly if anyone navigates to it. |
| `transformAlbum: false` | Album stays as 2-col group view even with knockout data stubbed. |
| `groupStandings: false` | Standings section vanishes from dashboard. |
| `ownerDetail: false` | Owner cards revert to non-clickable `<div>`s, no chevron, no hover-lift. |

After each test, restore the flag to `true`. End with all flags `true`.

- [ ] **Step 5: Run the full test suite one more time**

```bash
node --test tests/*.mjs
```

Expected: all tests pass.

Stop the server: `kill %1`.

- [ ] **Step 6: Commit a single empty commit marking v1.5 completion**

```bash
git commit --allow-empty -m "v1.5: post-group-stage features complete"
```

---
