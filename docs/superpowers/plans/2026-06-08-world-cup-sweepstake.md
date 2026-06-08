# World Cup 2026 Sweepstake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static GitHub Pages site that hosts a one-time live animated team draw for 6 friends and then runs as a Panini-themed tournament dashboard for the 2026 World Cup, before kickoff on 2026-06-11.

**Architecture:** Vanilla HTML/CSS/JS, no build step, no runtime backend. Two routes (`/` and `/draw.html`) backed by three JSON files (`teams.json`, `owners.json`, `results.json`) committed to the repo. A scheduled GitHub Action refreshes `results.json` every 6 hours by hitting a public football API; the dashboard renders from the committed snapshot and best-effort overlays live scores from the same API at runtime. UK/Cyprus timezone toggle persisted in `localStorage`.

**Tech Stack:** HTML5, CSS3 (CSS custom properties + dotted-border Panini theme), vanilla ES Modules (no bundler), `Intl.DateTimeFormat`, `crypto.getRandomValues`, Node 20+ for the Action script and unit tests via `node --test`, GitHub Pages, GitHub Actions.

**File map (locked in here so later tasks reference exact paths):**

```
/
├── README.md
├── .gitignore                       # already exists
├── index.html                       # dashboard
├── draw.html                        # one-time live draw
├── css/
│   └── styles.css                   # Panini theme + components
├── js/
│   ├── app.js                       # dashboard bootstrap
│   ├── draw.js                      # draw animation + export
│   ├── data.js                      # JSON loaders + state
│   ├── standings.js                 # group standings + alive/eliminated
│   ├── tz.js                        # timezone toggle + Intl helpers
│   └── render/
│       ├── header.js                # timezone toggle UI
│       ├── cover.js
│       ├── status.js
│       ├── album.js
│       ├── results.js               # latest results
│       ├── upcoming.js              # up next
│       └── footer.js
├── data/
│   ├── teams.json                   # 48 teams (hand-authored)
│   ├── owners.json                  # 6 owners (written by draw)
│   └── results.json                 # 104 matches (refreshed by Action)
├── scripts/
│   └── fetch-results.mjs            # API → results.json transform
├── tests/
│   ├── standings.test.mjs
│   └── tz.test.mjs
└── .github/
    └── workflows/
        └── fetch-results.yml        # 6-hourly cron + manual dispatch
```

**Working assumptions:**
- Default API provider: `football-data.org` v4. Free tier covers FIFA World Cup. **Validate in Task 0.** Fallback: `api-football.com` via RapidAPI.
- Default owner names go into `owners.json` as placeholders; the draw page overwrites them.
- Working on `main` directly with frequent commits. Site goes live as soon as Pages is enabled.

---

## Task 0: Validate API provider and provision key

**Files:** none (research + secret provisioning)

- [ ] **Step 1: Verify football-data.org free tier includes WC 2026**

Visit `https://www.football-data.org/coverage` and confirm "FIFA World Cup" appears in the free tier. Note the competition code (`WC` historically).

- [ ] **Step 2: Register and grab a free API token**

Sign up at `https://www.football-data.org/client/register`. Email confirmation gives a personal X-Auth-Token. Save it locally.

- [ ] **Step 3: Smoke-test from the terminal**

```bash
curl -s -H "X-Auth-Token: $YOUR_TOKEN" \
  "https://api.football-data.org/v4/competitions/WC/matches" | head -c 800
```

Expected: JSON response with a `matches` array. If 404 or `competition_not_found`, fall back to `api-football.com` (re-do Task 0 with their docs); update later tasks' fetch URL accordingly.

- [ ] **Step 4: No commit yet (token will be set as a repo secret in Task 21)**

---

## Task 1: Repo skeleton

**Files:**
- Create: `README.md`
- Create: `index.html`
- Create: `draw.html`
- Create: `css/styles.css`
- Create: `js/app.js`
- Create: `js/draw.js`
- Create: empty dirs `js/render/`, `data/`, `scripts/`, `tests/`, `.github/workflows/`

- [ ] **Step 1: Create `README.md`**

```markdown
# World Cup 2026 Sweepstake

A small Panini-themed static site for a 6-friend sweepstake on the 2026 FIFA World Cup.

- **/draw.html** — one-time live animated draw (run with friends, then commit the resulting `data/owners.json`).
- **/** — tournament dashboard. Renders from committed JSON; opportunistically overlays live scores.

See `docs/superpowers/specs/2026-06-08-world-cup-sweepstake-design.md` for the full design.

## Local development

```
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```
node --test tests/
```

## Data refresh

Refreshed every 6 hours by `.github/workflows/fetch-results.yml`. Run it manually any time:

```
gh workflow run fetch-results.yml
```
```

- [ ] **Step 2: Create `index.html` shell**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The 2026 Sweepstake · An Album of Glory</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main class="pn" id="app">
    <p class="loading">Opening the album…</p>
  </main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `draw.html` shell**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Draw · 2026 Sweepstake</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <main class="pn" id="draw">
    <p class="loading">Preparing the sticker pot…</p>
  </main>
  <script type="module" src="js/draw.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create stubs `css/styles.css`, `js/app.js`, `js/draw.js`**

`css/styles.css`:
```css
/* Panini theme — populated in Task 3 */
body { font-family: Georgia, serif; background: #fff7e8; color: #2b1d0e; }
.loading { text-align: center; padding: 4rem 1rem; font-style: italic; }
```

`js/app.js`:
```js
// Dashboard bootstrap — populated in Task 14
const app = document.getElementById('app');
app.innerHTML = '<p class="loading">app.js loaded — Task 14 will wire this up.</p>';
```

`js/draw.js`:
```js
// Draw — populated in Task 19
const root = document.getElementById('draw');
root.innerHTML = '<p class="loading">draw.js loaded — Task 19 will wire this up.</p>';
```

- [ ] **Step 5: Create the empty directories**

```bash
mkdir -p js/render data scripts tests .github/workflows
touch js/render/.gitkeep data/.gitkeep scripts/.gitkeep tests/.gitkeep .github/workflows/.gitkeep
```

- [ ] **Step 6: Smoke-test locally**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` and `http://localhost:8000/draw.html`. Both should show their loading message in Georgia serif on the cream background. Stop the server with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add README.md index.html draw.html css/ js/ data/ scripts/ tests/ .github/
git commit -m "Add repo skeleton: index, draw, and module/data folders"
```

---

## Task 2: Author `data/teams.json`

**Files:**
- Create: `data/teams.json`

The 2026 World Cup has 48 teams across 12 groups (A–L). Some qualifiers are still TBD at draft time — the engineer should source the most current list at execution time from FIFA's official site or Wikipedia's `2026 FIFA World Cup` article. Codes are FIFA 3-letter; flag emojis are standard Unicode regional indicators.

- [ ] **Step 1: Write the full 48-team JSON**

```json
[
  { "code": "CAN", "name": "Canada",        "flag": "🇨🇦", "group": "A" },
  { "code": "MEX", "name": "Mexico",        "flag": "🇲🇽", "group": "A" },
  { "code": "USA", "name": "United States", "flag": "🇺🇸", "group": "A" },

  { "code": "ARG", "name": "Argentina",     "flag": "🇦🇷", "group": "B" },
  { "code": "BRA", "name": "Brazil",        "flag": "🇧🇷", "group": "B" },
  { "code": "COL", "name": "Colombia",      "flag": "🇨🇴", "group": "B" },
  { "code": "ECU", "name": "Ecuador",       "flag": "🇪🇨", "group": "B" },
  { "code": "PAR", "name": "Paraguay",      "flag": "🇵🇾", "group": "B" },
  { "code": "URU", "name": "Uruguay",       "flag": "🇺🇾", "group": "B" }
]
```

The engineer fills in the remaining entries from FIFA's official 2026 list to total exactly 48 teams across groups A–L (4 per group). Validate count programmatically before committing.

- [ ] **Step 2: Validate the file**

```bash
node -e '
  const t = require("./data/teams.json");
  if (t.length !== 48) throw new Error("expected 48 teams, got " + t.length);
  const groups = {};
  for (const x of t) (groups[x.group] ||= []).push(x.code);
  for (const [g, codes] of Object.entries(groups))
    if (codes.length !== 4) throw new Error(`group ${g} has ${codes.length} teams`);
  console.log("teams.json OK:", t.length, "teams across", Object.keys(groups).length, "groups");
'
```

Expected: `teams.json OK: 48 teams across 12 groups`

- [ ] **Step 3: Commit**

```bash
git add data/teams.json
git commit -m "Add teams.json with 48 World Cup 2026 sides"
```

---

## Task 3: CSS foundation — Panini theme

**Files:**
- Modify: `css/styles.css` (full rewrite)

- [ ] **Step 1: Replace `css/styles.css` with the full theme**

```css
/* ---------- Tokens ---------- */
:root {
  --paper: #fff7e8;
  --paper-bright: #fffdf5;
  --paper-edge: #d4c4a0;
  --ink: #2b1d0e;
  --maroon: #8b1a1a;
  --gold: #f4d35e;
  --gold-deep: #ee964b;
  --out: #f0e8d8;
  --alive: #5a7a3a;
  --dead: #aa2222;
  --shadow: 1.5px 1.5px 0 var(--ink);

  --font-serif: Georgia, "Times New Roman", serif;
  --radius: 4px;
}

/* ---------- Base ---------- */
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-serif);
  background: var(--paper);
  color: var(--ink);
  line-height: 1.4;
}
.loading { text-align: center; padding: 4rem 1rem; font-style: italic; opacity: 0.7; }
.error { text-align: center; padding: 2rem 1rem; color: var(--maroon); font-style: italic; }

/* ---------- Page container ---------- */
.pn {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

/* ---------- Header / timezone toggle ---------- */
.pn-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 16px;
}
.tz { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.tz-label {
  font-size: 8px; font-weight: 800; letter-spacing: 2.5px;
  text-transform: uppercase;
}
.tz-grp { display: flex; gap: 5px; }
.tz button {
  background: var(--paper-bright);
  border: 1.5px solid var(--ink);
  border-radius: 3px;
  box-shadow: var(--shadow);
  width: 32px; height: 32px;
  font-size: 18px; line-height: 1;
  cursor: pointer; padding: 0;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease;
  font-family: inherit;
}
.tz button:hover:not(.active) {
  transform: translate(-0.5px, -0.5px);
  box-shadow: 2px 2px 0 var(--ink);
}
.tz button.active {
  background: var(--gold);
  box-shadow: 0.5px 0.5px 0 var(--ink);
  transform: translate(1px, 1px);
}

/* ---------- Cover ---------- */
.pn-cover {
  text-align: center;
  padding: 24px 16px;
  border: 3px double var(--ink);
  margin-bottom: 20px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--gold) 100%);
  position: relative;
}
.pn-cover::before,
.pn-cover::after {
  content: '★';
  position: absolute;
  top: 8px;
  font-size: 18px;
  color: var(--maroon);
}
.pn-cover::before { left: 12px; }
.pn-cover::after { right: 12px; }
.pn-title {
  font-size: 32px;
  font-weight: 900;
  font-style: italic;
  color: var(--maroon);
  letter-spacing: -0.5px;
  margin: 0;
  line-height: 1;
}
.pn-subtitle {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-top: 6px;
}
.pn-matchday {
  display: inline-block;
  background: var(--ink);
  color: var(--gold);
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  transform: rotate(-1deg);
  margin-top: 10px;
}

/* ---------- Section heading ---------- */
.pn-section { margin-top: 24px; }
.pn-section h3 {
  font-style: italic;
  font-size: 20px;
  color: var(--maroon);
  margin: 0 0 12px;
  border-bottom: 2px dotted var(--ink);
  padding-bottom: 4px;
}

/* ---------- Status strip ---------- */
.pn-status { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.pn-stat {
  background: var(--paper-bright);
  border: 1px solid var(--paper-edge);
  padding: 10px;
  border-radius: var(--radius);
  text-align: center;
}
.pn-stat .big { font-size: 22px; font-weight: 900; color: var(--maroon); }
.pn-stat .lbl {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.7;
}

/* ---------- Album / owners ---------- */
.pn-owners { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 600px) { .pn-owners { grid-template-columns: 1fr; } }
.pn-owner {
  background: var(--paper-bright);
  border: 1px solid var(--paper-edge);
  border-radius: 6px;
  padding: 10px;
}
.pn-owner-name {
  font-weight: 700;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.pn-owner-alive { font-size: 10px; color: var(--alive); font-weight: 700; }
.pn-owner-out   { font-size: 10px; color: var(--dead);  font-weight: 700; }
.pn-stickers { display: flex; flex-wrap: wrap; gap: 5px; }
.pn-sticker {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  width: 34px; height: 44px;
  background: linear-gradient(135deg, var(--paper-bright) 0%, var(--gold) 100%);
  border: 1.5px solid var(--ink);
  border-radius: 3px;
  box-shadow: var(--shadow);
  padding: 2px;
  overflow: hidden;
  flex: 0 0 auto;
}
.pn-sticker .flag { font-size: 16px; line-height: 1; }
.pn-sticker .code {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.3px;
  margin-top: 2px;
}
.pn-sticker.out { background: var(--out); box-shadow: none; }
.pn-sticker.out .flag,
.pn-sticker.out .code { filter: grayscale(1); opacity: 0.45; }
.pn-sticker.out::after {
  content: 'OUT';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
  background: var(--maroon); color: var(--paper);
  font-size: 7px; font-weight: 900; letter-spacing: 1px;
  padding: 1px 4px;
  border: 1px solid var(--maroon);
}

/* ---------- Match cards (results + upcoming) ---------- */
.pn-results { display: flex; flex-direction: column; gap: 6px; }
.pn-match {
  background: var(--paper-bright);
  border: 1px solid var(--paper-edge);
  padding: 8px 12px;
  border-radius: var(--radius);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
  font-size: 13px;
}
.pn-match .home { text-align: right; }
.pn-match .away { text-align: left;  }
.pn-match .score-col { display: flex; flex-direction: column; align-items: center; line-height: 1.2; }
.pn-match .sc { font-weight: 900; font-size: 16px; color: var(--maroon); }
.pn-match .when {
  font-size: 9px;
  font-style: italic;
  opacity: 0.65;
  margin-top: 2px;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.pn-match.upcoming .sc {
  color: var(--ink);
  opacity: 0.5;
  font-style: italic;
  font-size: 12px;
}
.pn-match .live-badge {
  display: inline-block;
  font-size: 8px;
  background: var(--maroon);
  color: var(--paper);
  padding: 1px 5px;
  border-radius: 2px;
  font-weight: 800;
  letter-spacing: 1px;
  margin-top: 4px;
}
.pn-owner-tag {
  display: inline-block;
  font-size: 9px;
  background: var(--gold);
  padding: 1px 4px;
  border-radius: 2px;
  margin-left: 4px;
}

/* ---------- Footer ---------- */
.pn-foot {
  text-align: center;
  margin-top: 24px;
  padding-top: 12px;
  border-top: 2px dotted var(--ink);
  font-size: 10px;
  opacity: 0.7;
  font-style: italic;
}
.pn-foot a { color: var(--maroon); }

/* ---------- Pre-draw banner ---------- */
.pn-empty {
  text-align: center;
  padding: 32px 16px;
  border: 2px dashed var(--ink);
  background: var(--paper-bright);
  border-radius: var(--radius);
  font-style: italic;
}
.pn-empty a { color: var(--maroon); font-weight: 700; }
```

- [ ] **Step 2: Visual smoke test**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. The "Opening the album…" loading message should now be styled in italic Georgia, centred, on the cream background. No console errors. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "Add Panini theme: tokens, cover, status, album, match cards"
```

---

## Task 4: `js/tz.js` — timezone module with tests

**Files:**
- Create: `js/tz.js`
- Create: `tests/tz.test.mjs`

The module exposes:
- `getZone()` → `"Europe/London"` or `"Asia/Nicosia"` (reads `localStorage`, defaults to London)
- `setZone(zoneId)` → persists `localStorage.sweep26.tz`, dispatches a `tz-change` event on `window`
- `formatTime(iso)` → `"18:00"` (24h, current zone)
- `formatRelativeDay(iso, nowIso)` → `"Today"`, `"Yesterday"`, `"Tomorrow"`, or `"14 Jun"`
- `formatMatchDateTime(iso, nowIso)` → human label combining the two (e.g. `"Yesterday · 20:00"`)

- [ ] **Step 1: Write the failing tests**

`tests/tz.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, formatRelativeDay, formatMatchDateTime, setZone, getZone, ZONES } from '../js/tz.js';

// 2026-06-14T18:00:00Z = 19:00 BST in London, 21:00 EEST in Nicosia.
const ISO_KICK = '2026-06-14T18:00:00Z';
const NOW_SAME_DAY = '2026-06-14T22:00:00Z'; // "today" in both zones
const NOW_NEXT_DAY = '2026-06-15T08:00:00Z'; // "yesterday" in both zones

test('zone constants are exported', () => {
  assert.equal(ZONES.UK, 'Europe/London');
  assert.equal(ZONES.CY, 'Asia/Nicosia');
});

test('default zone is UK when nothing stored', () => {
  globalThis.localStorage = makeStubStorage();
  assert.equal(getZone(), 'Europe/London');
});

test('setZone persists and getZone reads it back', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Asia/Nicosia');
  assert.equal(getZone(), 'Asia/Nicosia');
});

test('formatTime renders 24-hour in current zone', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Europe/London');
  assert.equal(formatTime(ISO_KICK), '19:00');
  setZone('Asia/Nicosia');
  assert.equal(formatTime(ISO_KICK), '21:00');
});

test('formatRelativeDay returns Today / Yesterday / explicit date', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Europe/London');
  assert.equal(formatRelativeDay(ISO_KICK, NOW_SAME_DAY), 'Today');
  assert.equal(formatRelativeDay(ISO_KICK, NOW_NEXT_DAY), 'Yesterday');
  assert.equal(
    formatRelativeDay('2026-06-11T20:00:00Z', NOW_NEXT_DAY),
    '11 Jun'
  );
});

test('formatMatchDateTime combines day label with time', () => {
  globalThis.localStorage = makeStubStorage();
  setZone('Europe/London');
  assert.equal(formatMatchDateTime(ISO_KICK, NOW_SAME_DAY), 'Today · 19:00');
  assert.equal(formatMatchDateTime(ISO_KICK, NOW_NEXT_DAY), 'Yesterday · 19:00');
});

function makeStubStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
```

- [ ] **Step 2: Run the tests; expect failure**

```bash
node --test tests/tz.test.mjs
```

Expected: every test fails with "Cannot find module" or "is not a function" — `tz.js` does not yet exist.

- [ ] **Step 3: Implement `js/tz.js`**

```js
export const ZONES = Object.freeze({
  UK: 'Europe/London',
  CY: 'Asia/Nicosia',
});

const STORAGE_KEY = 'sweep26.tz';
const VALID = new Set(Object.values(ZONES));

export function getZone() {
  const stored = (globalThis.localStorage?.getItem(STORAGE_KEY) ?? '').trim();
  return VALID.has(stored) ? stored : ZONES.UK;
}

export function setZone(zoneId) {
  if (!VALID.has(zoneId)) throw new Error(`unknown zone: ${zoneId}`);
  globalThis.localStorage?.setItem(STORAGE_KEY, zoneId);
  globalThis.window?.dispatchEvent?.(new CustomEvent('tz-change', { detail: { zone: zoneId } }));
}

export function formatTime(iso, zone = getZone()) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: zone,
  }).format(new Date(iso));
}

export function formatRelativeDay(iso, nowIso = new Date().toISOString(), zone = getZone()) {
  const dayOf = (d) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date(d));
  const target = dayOf(iso);
  const today = dayOf(nowIso);

  const targetTs = Date.parse(target + 'T00:00:00Z');
  const todayTs  = Date.parse(today  + 'T00:00:00Z');
  const diffDays = Math.round((targetTs - todayTs) / 86_400_000);

  if (diffDays === 0)  return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1)  return 'Tomorrow';

  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: zone }).format(new Date(iso));
}

export function formatMatchDateTime(iso, nowIso = new Date().toISOString(), zone = getZone()) {
  return `${formatRelativeDay(iso, nowIso, zone)} · ${formatTime(iso, zone)}`;
}
```

- [ ] **Step 4: Run the tests; expect pass**

```bash
node --test tests/tz.test.mjs
```

Expected: 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add js/tz.js tests/tz.test.mjs
git commit -m "Add tz module: zone toggle storage + Intl-based formatters"
```

---

## Task 5: Header render module — timezone toggle UI

**Files:**
- Create: `js/render/header.js`

- [ ] **Step 1: Implement `js/render/header.js`**

```js
import { getZone, setZone, ZONES } from '../tz.js';

export function renderHeader(container) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'pn-header';

  const tz = document.createElement('div');
  tz.className = 'tz';

  const label = document.createElement('span');
  label.className = 'tz-label';
  label.textContent = 'Timezone';

  const grp = document.createElement('div');
  grp.className = 'tz-grp';

  const current = getZone();
  for (const [shortCode, zoneId, flag, name] of [
    ['uk', ZONES.UK, '🇬🇧', 'UK'],
    ['cy', ZONES.CY, '🇨🇾', 'Cyprus'],
  ]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.zone = zoneId;
    btn.title = name;
    btn.textContent = flag;
    if (zoneId === current) btn.classList.add('active');
    btn.addEventListener('click', () => {
      setZone(zoneId);
      for (const b of grp.querySelectorAll('button')) {
        b.classList.toggle('active', b.dataset.zone === zoneId);
      }
    });
    grp.appendChild(btn);
  }

  tz.append(label, grp);
  wrap.appendChild(tz);
  container.appendChild(wrap);
}
```

- [ ] **Step 2: Wire a temporary harness into `index.html` for visual test**

Temporarily edit `js/app.js` to:
```js
import { renderHeader } from './render/header.js';
const app = document.getElementById('app');
app.innerHTML = '';
renderHeader(app);

window.addEventListener('tz-change', (e) => console.log('tz-change', e.detail));
```

- [ ] **Step 3: Visual + interactive test**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Confirm:
- "TIMEZONE" label is visible top-right.
- 🇬🇧 button starts active (gold, pressed-in).
- Clicking 🇨🇾 swaps the active state.
- Reload page → previous selection persists.
- Console logs `tz-change` events.

Stop server.

- [ ] **Step 4: Revert `js/app.js` to the harness stub**

```js
// Dashboard bootstrap — populated in Task 14
const app = document.getElementById('app');
app.innerHTML = '<p class="loading">app.js loaded — Task 14 will wire this up.</p>';
```

- [ ] **Step 5: Commit**

```bash
git add js/render/header.js js/app.js
git commit -m "Add header render module with UK/Cyprus timezone toggle"
```

---

## Task 6: `js/data.js` — JSON loaders and app state

**Files:**
- Create: `js/data.js`

- [ ] **Step 1: Implement `js/data.js`**

```js
const SOURCES = {
  teams:   'data/teams.json',
  owners:  'data/owners.json',
  results: 'data/results.json',
};

async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`);
  return res.json();
}

export async function loadAll() {
  const [teams, owners, results] = await Promise.all([
    loadJson(SOURCES.teams),
    loadJson(SOURCES.owners).catch(() => ({ drawCompletedAt: null, owners: [] })),
    loadJson(SOURCES.results).catch(() => ({ lastUpdated: null, matches: [] })),
  ]);
  return { teams, owners, results };
}

export function teamByCode(teams, code) {
  return teams.find((t) => t.code === code);
}

export function ownerForTeam(owners, code) {
  if (!owners?.owners) return null;
  return owners.owners.find((o) => o.teams?.includes(code))?.name ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/data.js
git commit -m "Add data module: parallel JSON loaders with safe fallbacks"
```

---

## Task 7: `js/standings.js` — group standings + alive/eliminated, with tests

**Files:**
- Create: `js/standings.js`
- Create: `tests/standings.test.mjs`

FIFA tiebreakers (group stage):
1. Points (W=3, D=1, L=0)
2. Goal difference
3. Goals for
4. Head-to-head points (between tied teams)
5. (Beyond that: yellow cards, drawing of lots — out of scope, we'll stop at H2H)

The module exposes:
- `computeStandings(groupCode, teams, matches)` → ordered array of `{ code, played, won, drawn, lost, gf, ga, gd, points }`
- `isAlive(teamCode, teams, matches)` → boolean (true unless team has been eliminated)

The simplest definition of "alive":
- Group stage in progress / not started → still alive (we don't predict).
- All three group games played: alive iff team is in top 2 of its group, OR (top-8 third place across the 12 groups in 2026's 48-team format). For v1 simplicity, treat ranking by points → GD → GF and take top 2 as alive; mark 3rd/4th as eliminated at group end. (Third-place advancement is approximated; refine post-kickoff if it materially matters.)
- Knockouts: alive until they lose a `status: "finished"` knockout match.

- [ ] **Step 1: Write the failing tests**

`tests/standings.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings, isAlive } from '../js/standings.js';

const TEAMS = [
  { code: 'BRA', name: 'Brazil',     group: 'B' },
  { code: 'ARG', name: 'Argentina',  group: 'B' },
  { code: 'COL', name: 'Colombia',   group: 'B' },
  { code: 'URU', name: 'Uruguay',    group: 'B' },
];

function finished(home, h, a, away, kickoff = '2026-06-12T00:00:00Z') {
  return {
    id: `${home}-${away}`,
    stage: 'group',
    group: 'B',
    kickoff,
    home, away,
    status: 'finished',
    homeScore: h, awayScore: a,
  };
}

test('computeStandings orders by points then GD then GF', () => {
  const matches = [
    finished('BRA', 2, 0, 'ARG'),   // BRA win
    finished('COL', 1, 1, 'URU'),   // draw
    finished('BRA', 3, 0, 'COL'),   // BRA win
    finished('ARG', 2, 0, 'URU'),   // ARG win
    finished('BRA', 1, 0, 'URU'),   // BRA win
    finished('ARG', 2, 1, 'COL'),   // ARG win
  ];
  const table = computeStandings('B', TEAMS, matches);
  assert.equal(table[0].code, 'BRA');
  assert.equal(table[0].points, 9);
  assert.equal(table[1].code, 'ARG');
  assert.equal(table[1].points, 6);
  assert.equal(table[2].code, 'COL');
  assert.equal(table[3].code, 'URU');
});

test('isAlive: group stage in progress → all teams alive', () => {
  const matches = [finished('BRA', 2, 0, 'ARG')];
  for (const t of TEAMS) assert.equal(isAlive(t.code, TEAMS, matches), true);
});

test('isAlive: after all group games, top 2 alive, others eliminated', () => {
  const matches = [
    finished('BRA', 2, 0, 'ARG'),
    finished('COL', 1, 1, 'URU'),
    finished('BRA', 3, 0, 'COL'),
    finished('ARG', 2, 0, 'URU'),
    finished('BRA', 1, 0, 'URU'),
    finished('ARG', 2, 1, 'COL'),
  ];
  assert.equal(isAlive('BRA', TEAMS, matches), true);
  assert.equal(isAlive('ARG', TEAMS, matches), true);
  assert.equal(isAlive('COL', TEAMS, matches), false);
  assert.equal(isAlive('URU', TEAMS, matches), false);
});

test('isAlive: knockout loss eliminates the loser', () => {
  const koMatch = {
    id: 'r16-bra-mex',
    stage: 'r16',
    kickoff: '2026-06-30T18:00:00Z',
    home: 'BRA', away: 'MEX',
    status: 'finished',
    homeScore: 1, awayScore: 2,
  };
  const knockoutTeams = [
    ...TEAMS,
    { code: 'MEX', name: 'Mexico', group: 'A' },
  ];
  assert.equal(isAlive('BRA', knockoutTeams, [koMatch]), false);
  assert.equal(isAlive('MEX', knockoutTeams, [koMatch]), true);
});

test('isAlive: live knockout match does not eliminate yet', () => {
  const live = {
    id: 'r16-bra-mex',
    stage: 'r16',
    kickoff: '2026-06-30T18:00:00Z',
    home: 'BRA', away: 'MEX',
    status: 'live',
    homeScore: 0, awayScore: 1,
  };
  assert.equal(isAlive('BRA', [{ code: 'BRA', group: 'B' }, { code: 'MEX', group: 'A' }], [live]), true);
});
```

- [ ] **Step 2: Run tests; expect failure**

```bash
node --test tests/standings.test.mjs
```

Expected: every test fails — `standings.js` does not exist.

- [ ] **Step 3: Implement `js/standings.js`**

```js
const KNOCKOUT_STAGES = new Set(['r32', 'r16', 'qf', 'sf', 'final', 'third']);

function emptyRow(code) {
  return { code, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

export function computeStandings(groupCode, teams, matches) {
  const rows = new Map(
    teams.filter((t) => t.group === groupCode).map((t) => [t.code, emptyRow(t.code)])
  );
  const groupMatches = matches.filter(
    (m) => m.stage === 'group' && m.group === groupCode && m.status === 'finished'
  );

  for (const m of groupMatches) {
    const home = rows.get(m.home);
    const away = rows.get(m.away);
    if (!home || !away) continue;

    home.played += 1; away.played += 1;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;

    if (m.homeScore > m.awayScore)       { home.won += 1;   home.points += 3; away.lost += 1; }
    else if (m.homeScore < m.awayScore)  { away.won += 1;   away.points += 3; home.lost += 1; }
    else                                  { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
  }

  for (const r of rows.values()) r.gd = r.gf - r.ga;

  const table = [...rows.values()];
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.code.localeCompare(b.code); // stable, deterministic
  });
  return table;
}

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

  // Group: only eliminate once all 3 group matches for this team are finished.
  const groupFinished = matches.filter(
    (m) => m.stage === 'group' && m.group === team.group && m.status === 'finished'
  );
  const teamMatchesPlayed = groupFinished.filter((m) => m.home === teamCode || m.away === teamCode).length;
  if (teamMatchesPlayed < 3) return true;

  const table = computeStandings(team.group, teams, matches);
  const rank = table.findIndex((r) => r.code === teamCode);
  return rank < 2; // top 2 advance — third-place wildcards approximated as "out" for v1
}
```

- [ ] **Step 4: Run tests; expect pass**

```bash
node --test tests/standings.test.mjs
```

Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add js/standings.js tests/standings.test.mjs
git commit -m "Add standings module: group table + alive/eliminated derivation"
```

---

## Task 8: Cover render module

**Files:**
- Create: `js/render/cover.js`

- [ ] **Step 1: Implement `js/render/cover.js`**

```js
import { formatRelativeDay } from '../tz.js';

function currentMatchdayLabel(results, nowIso) {
  const today = formatRelativeDay(nowIso, nowIso); // 'Today'
  const dateStr = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(new Date(nowIso));

  // Stage detection from the next scheduled or in-flight match.
  const active = results?.matches?.find((m) => m.status !== 'finished');
  const stageLabel = labelForStage(active?.stage ?? 'group');

  return `${stageLabel} · ${dateStr}`;
}

function labelForStage(stage) {
  switch (stage) {
    case 'group':  return 'Group Stage';
    case 'r32':    return 'Round of 32';
    case 'r16':    return 'Round of 16';
    case 'qf':     return 'Quarter-finals';
    case 'sf':     return 'Semi-finals';
    case 'third':  return '3rd-Place Play-Off';
    case 'final':  return 'Final';
    default:       return 'World Cup';
  }
}

export function renderCover(container, { results }, nowIso = new Date().toISOString()) {
  const cover = document.createElement('section');
  cover.className = 'pn-cover';
  cover.innerHTML = `
    <h1 class="pn-title">The 2026 Sweepstake</h1>
    <div class="pn-subtitle">An Album of Glory</div>
    <div class="pn-matchday">${currentMatchdayLabel(results, nowIso)}</div>
  `;
  container.appendChild(cover);
}
```

- [ ] **Step 2: Commit**

```bash
git add js/render/cover.js
git commit -m "Add cover render module with current matchday label"
```

---

## Task 9: Status strip render module

**Files:**
- Create: `js/render/status.js`

- [ ] **Step 1: Implement `js/render/status.js`**

```js
import { isAlive } from '../standings.js';

export function renderStatus(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const teamsAlive = teams.filter((t) => isAlive(t.code, teams, results.matches ?? [])).length;
  const leader = leadingOwner({ teams, owners, results });
  const todayCount = matchesOn(results.matches ?? [], nowIso);

  const strip = document.createElement('section');
  strip.className = 'pn-status';
  strip.innerHTML = `
    <div class="pn-stat"><div class="big">${teamsAlive}</div><div class="lbl">teams still in</div></div>
    <div class="pn-stat"><div class="big">${escape(leader ?? '—')}</div><div class="lbl">leading the album</div></div>
    <div class="pn-stat"><div class="big">${todayCount}</div><div class="lbl">matches today</div></div>
  `;
  container.appendChild(strip);
}

function leadingOwner({ teams, owners, results }) {
  if (!owners?.owners?.length) return null;
  let best = { name: null, count: -1 };
  for (const o of owners.owners) {
    const alive = (o.teams ?? []).filter((c) => isAlive(c, teams, results.matches ?? [])).length;
    if (alive > best.count) best = { name: o.name, count: alive };
  }
  return best.name;
}

function matchesOn(matches, nowIso) {
  const day = (iso) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(new Date(iso));
  const today = day(nowIso);
  return matches.filter((m) => day(m.kickoff) === today).length;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Commit**

```bash
git add js/render/status.js
git commit -m "Add status strip render module"
```

---

## Task 10: Album render module (owners + stickers)

**Files:**
- Create: `js/render/album.js`

- [ ] **Step 1: Implement `js/render/album.js`**

```js
import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';

export function renderAlbum(container, { teams, owners, results }) {
  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>The Album · Who owns what</h3>`;

  const grid = document.createElement('div');
  grid.className = 'pn-owners';

  for (const owner of owners.owners ?? []) {
    grid.appendChild(renderOwnerCard(owner, teams, results.matches ?? []));
  }

  section.appendChild(grid);
  container.appendChild(section);
}

function renderOwnerCard(owner, teams, matches) {
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

function stickerHtml(code, teams, matches) {
  const t = teamByCode(teams, code);
  if (!t) return `<div class="pn-sticker out"><span class="flag">❓</span><span class="code">${escape(code)}</span></div>`;
  const outCls = isAlive(code, teams, matches) ? '' : ' out';
  return `<div class="pn-sticker${outCls}" title="${escape(t.name)}"><span class="flag">${t.flag}</span><span class="code">${escape(t.code)}</span></div>`;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Commit**

```bash
git add js/render/album.js
git commit -m "Add album render module: owner cards with sticker tiles"
```

---

## Task 11: Latest results render module

**Files:**
- Create: `js/render/results.js`

- [ ] **Step 1: Implement `js/render/results.js`**

```js
import { formatMatchDateTime } from '../tz.js';
import { teamByCode, ownerForTeam } from '../data.js';

const MAX_LATEST = 6;

export function renderLatestResults(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const finished = (results.matches ?? [])
    .filter((m) => m.status === 'finished')
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
    .slice(0, MAX_LATEST);

  if (!finished.length) return; // first kickoff hasn't happened yet

  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>Latest Results</h3>`;

  const list = document.createElement('div');
  list.className = 'pn-results';
  for (const m of finished) list.appendChild(matchCard(m, teams, owners, nowIso));
  section.appendChild(list);
  container.appendChild(section);
}

function matchCard(m, teams, owners, nowIso) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const homeOwner = ownerForTeam(owners, m.home);
  const awayOwner = ownerForTeam(owners, m.away);

  const el = document.createElement('div');
  el.className = 'pn-match';
  el.innerHTML = `
    <span class="home">${flag(home)} ${escape(home?.name ?? m.home)}${ownerTag(homeOwner)}</span>
    <span class="score-col">
      <span class="sc">${m.homeScore} – ${m.awayScore}</span>
      <span class="when">${formatMatchDateTime(m.kickoff, nowIso)}</span>
    </span>
    <span class="away">${flag(away)} ${escape(away?.name ?? m.away)}${ownerTag(awayOwner)}</span>
  `;
  return el;
}

function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}
function flag(t) { return t?.flag ?? '🏳️'; }
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Commit**

```bash
git add js/render/results.js
git commit -m "Add latest results render module with timestamped score cards"
```

---

## Task 12: Up next render module

**Files:**
- Create: `js/render/upcoming.js`

- [ ] **Step 1: Implement `js/render/upcoming.js`**

```js
import { formatMatchDateTime } from '../tz.js';
import { teamByCode, ownerForTeam } from '../data.js';

const MAX_UPCOMING = 6;

export function renderUpcoming(container, { teams, owners, results }, nowIso = new Date().toISOString()) {
  const upcoming = (results.matches ?? [])
    .filter((m) => m.status === 'scheduled' && m.kickoff > nowIso)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
    .slice(0, MAX_UPCOMING);

  if (!upcoming.length) return;

  const section = document.createElement('section');
  section.className = 'pn-section';
  section.innerHTML = `<h3>Up Next</h3>`;

  const list = document.createElement('div');
  list.className = 'pn-results';
  for (const m of upcoming) list.appendChild(upcomingCard(m, teams, owners, nowIso));
  section.appendChild(list);
  container.appendChild(section);
}

function upcomingCard(m, teams, owners, nowIso) {
  const home = teamByCode(teams, m.home);
  const away = teamByCode(teams, m.away);
  const el = document.createElement('div');
  el.className = 'pn-match upcoming';
  el.innerHTML = `
    <span class="home">${flag(home)} ${escape(home?.name ?? m.home)}${ownerTag(ownerForTeam(owners, m.home))}</span>
    <span class="sc">${formatMatchDateTime(m.kickoff, nowIso)}</span>
    <span class="away">${flag(away)} ${escape(away?.name ?? m.away)}${ownerTag(ownerForTeam(owners, m.away))}</span>
  `;
  return el;
}

function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}
function flag(t) { return t?.flag ?? '🏳️'; }
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Commit**

```bash
git add js/render/upcoming.js
git commit -m "Add up-next render module with localized kickoff time"
```

---

## Task 13: Footer render module

**Files:**
- Create: `js/render/footer.js`

- [ ] **Step 1: Implement `js/render/footer.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add js/render/footer.js
git commit -m "Add footer render module with refresh stamp and route links"
```

---

## Task 14: `js/app.js` — dashboard bootstrap

**Files:**
- Modify: `js/app.js` (full rewrite)

- [ ] **Step 1: Replace `js/app.js`**

```js
import { loadAll } from './data.js';
import { renderHeader }         from './render/header.js';
import { renderCover }          from './render/cover.js';
import { renderStatus }         from './render/status.js';
import { renderAlbum }          from './render/album.js';
import { renderLatestResults }  from './render/results.js';
import { renderUpcoming }       from './render/upcoming.js';
import { renderFooter }         from './render/footer.js';

const FIRST_KICKOFF_ISO = '2026-06-11T20:00:00Z';

async function main() {
  const root = document.getElementById('app');
  let state;
  try {
    state = await loadAll();
  } catch (err) {
    root.innerHTML = `<p class="error">Couldn't load tournament data — ${escapeHtml(err.message)}</p>`;
    return;
  }

  paint(root, state);
  window.addEventListener('tz-change', () => paint(root, state));
}

function paint(root, state) {
  root.innerHTML = '';
  const now = new Date().toISOString();

  renderHeader(root);
  renderCover(root, state, now);

  if (!state.owners?.drawCompletedAt) {
    renderPreDrawBanner(root);
  } else {
    renderStatus(root, state, now);
    renderAlbum(root, state);
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

main();
```

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "Wire dashboard: header, cover, status, album, results, upcoming, footer"
```

---

## Task 15: Initial `data/owners.json` and `data/results.json`

**Files:**
- Create: `data/owners.json`
- Create: `data/results.json`

- [ ] **Step 1: Create empty `data/owners.json`**

```json
{
  "drawCompletedAt": null,
  "owners": []
}
```

- [ ] **Step 2: Create empty `data/results.json`**

```json
{
  "lastUpdated": null,
  "matches": []
}
```

- [ ] **Step 3: Commit**

```bash
git add data/owners.json data/results.json
git commit -m "Seed empty owners.json and results.json"
```

---

## Task 16: Manual smoke test — empty / pre-draw state

**Files:** none

- [ ] **Step 1: Serve and load**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Expected:
- Timezone toggle visible top-right.
- Cover renders: "The 2026 Sweepstake · An Album of Glory · Group Stage · <today's date>".
- "The draw hasn't happened yet — head to /draw to run it." banner replaces the album/results.
- Footer: "no refresh yet · /draw · /bracket coming 30 June".
- Clicking the 🇨🇾 toggle changes the active state; no time strings change yet because there are no matches.

Stop the server.

- [ ] **Step 2: Test with a stubbed dataset (don't commit)**

Temporarily replace `data/owners.json` with:
```json
{
  "drawCompletedAt": "2026-06-10T19:30:00Z",
  "owners": [
    { "name": "Marco", "teams": ["BRA", "ARG"] },
    { "name": "Sam",   "teams": ["ESP", "FRA"] }
  ]
}
```

…and `data/results.json` with two matches: one finished, one scheduled (use today/tomorrow ISO times). Reload the page and confirm:
- Album section shows Marco and Sam each with 2 stickers (full colour).
- Latest Results shows the one finished match with score + "Today · HH:MM".
- Up Next shows the scheduled match with "Tomorrow · HH:MM".
- Toggling 🇨🇾 shifts the times by 2 hours across the page.

- [ ] **Step 3: Revert the stubs**

```bash
git checkout -- data/owners.json data/results.json
```

(No commit — this was a manual smoke test.)

---

## Task 17: Live API overlay (best-effort)

**Files:**
- Create: `js/live.js`
- Modify: `js/app.js` (add the overlay call)

Provider-specific endpoint. Update if Task 0 picked a different provider.

- [ ] **Step 1: Create `js/live.js`**

```js
const TIMEOUT_MS = 3000;
const PROVIDER_URL = 'https://api.football-data.org/v4/competitions/WC/matches?status=LIVE,IN_PLAY,PAUSED';

export async function fetchLiveMatches() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(PROVIDER_URL, { signal: controller.signal });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.matches ?? []).map(normalise);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function normalise(m) {
  return {
    id: String(m.id),
    home: m.homeTeam?.tla,
    away: m.awayTeam?.tla,
    homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? 0,
    awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? 0,
    status: 'live',
  };
}

export function mergeLive(staticMatches, liveMatches) {
  const overlay = new Map(liveMatches.map((m) => [`${m.home}-${m.away}`, m]));
  return staticMatches.map((m) => {
    const live = overlay.get(`${m.home}-${m.away}`);
    return live
      ? { ...m, status: 'live', homeScore: live.homeScore, awayScore: live.awayScore, live: true }
      : m;
  });
}
```

- [ ] **Step 2: Wire it into `js/app.js`**

Append below `main()` and modify `main()` so it kicks off the live fetch after the first paint:

```js
import { fetchLiveMatches, mergeLive } from './live.js';
```

In `main()`, after `paint(root, state)`:
```js
  fetchLiveMatches().then((live) => {
    if (!live.length) return;
    state = { ...state, results: { ...state.results, matches: mergeLive(state.results.matches ?? [], live) } };
    paint(root, state);
  });
```

- [ ] **Step 3: Smoke test**

Serve the site. Live fetch should be best-effort — if blocked by CORS or unauthenticated, the page must still render perfectly from the static data. Open DevTools network; confirm the live request fires and any failure is silent.

- [ ] **Step 4: Commit**

```bash
git add js/live.js js/app.js
git commit -m "Add best-effort live overlay on top of static results"
```

---

## Task 18: Draw page — animated draw + export

**Files:**
- Modify: `js/draw.js` (full implementation)
- Modify: `css/styles.css` (append draw-specific styles)

The draw flow:
1. Read existing `data/teams.json` and `data/owners.json`.
2. Show 6 name inputs (pre-filled from `owners.json` if names exist).
3. "Begin the Draw" → for each owner sequentially, randomly take 8 teams from the remaining pool with a brief animation.
4. Show final summary + a "Download owners.json" button + a "Copy share link" button.
5. URL hash encodes the result so a refresh preserves it.

- [ ] **Step 1: Append draw styles to `css/styles.css`**

```css
/* ---------- Draw page ---------- */
.draw-form { display: flex; flex-direction: column; gap: 8px; max-width: 320px; margin: 16px auto; }
.draw-form input {
  background: var(--paper-bright); border: 1.5px solid var(--ink);
  border-radius: var(--radius); padding: 8px 10px; font: inherit;
  box-shadow: var(--shadow);
}
.draw-form button {
  background: var(--gold); border: 2px solid var(--ink); border-radius: var(--radius);
  box-shadow: 2px 2px 0 var(--ink); padding: 10px 14px; font: inherit;
  font-weight: 800; cursor: pointer;
}
.draw-form button:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--ink); }
.draw-pool {
  display: flex; flex-wrap: wrap; gap: 6px;
  background: var(--paper-bright); border: 1px solid var(--paper-edge);
  padding: 12px; border-radius: var(--radius); margin: 12px 0;
  min-height: 60px;
}
.draw-pool .pn-sticker { transition: transform 0.5s ease, opacity 0.5s ease; }
.draw-pool .pn-sticker.taken { opacity: 0; transform: scale(0); pointer-events: none; }
.draw-current {
  font-style: italic; text-align: center; margin: 8px 0;
  color: var(--maroon); font-size: 14px;
}
.draw-actions {
  display: flex; gap: 10px; justify-content: center; margin: 16px 0;
}
.draw-actions button {
  background: var(--gold); border: 2px solid var(--ink); border-radius: var(--radius);
  box-shadow: 2px 2px 0 var(--ink); padding: 10px 14px; font: inherit;
  font-weight: 800; cursor: pointer;
}
.draw-actions button:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--ink); }
```

- [ ] **Step 2: Implement `js/draw.js`**

```js
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

async function runDraw(teams, names) {
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
  const pool = [...teams];
  shuffle(pool);

  const result = { drawCompletedAt: null, owners: names.map((n) => ({ name: n, teams: [] })) };
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

  result.drawCompletedAt = new Date().toISOString();
  writeHash(result);
  renderResult(teams, result);
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
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cssEscape(s) { return String(s).replace(/"/g, '\\"'); }
```

- [ ] **Step 3: Manual test the draw**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/draw.html`. Confirm:
- Six name inputs are pre-filled with placeholders.
- Submit reveals the pool of 48 stickers and the 6 owner cards.
- Each owner's card fills with 8 stickers, animated, removing each from the pool.
- After completion, total stickers placed = 48 with zero duplicates (open DevTools console: `document.querySelectorAll('#draw-owners .pn-sticker').length === 48`).
- "Download owners.json" produces a file you can open in a JSON viewer with the correct shape.
- Reloading the page after completion preserves the result via the URL hash.
- "Redo draw" resets and lets you start over.

- [ ] **Step 4: Commit**

```bash
git add js/draw.js css/styles.css
git commit -m "Add live animated draw with crypto.getRandomValues + JSON export"
```

---

## Task 19: `scripts/fetch-results.mjs` — API → results.json

**Files:**
- Create: `scripts/fetch-results.mjs`

- [ ] **Step 1: Implement the script**

```js
#!/usr/bin/env node
// Fetches WC matches from football-data.org and writes data/results.json.
// Environment:
//   FOOTBALL_API_KEY  required (X-Auth-Token header)
//   API_URL           optional override (defaults to the WC competition endpoint)

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const URL_DEFAULT = 'https://api.football-data.org/v4/competitions/WC/matches';
const OUT_PATH = path.resolve('data/results.json');

const STAGE_MAP = {
  GROUP_STAGE: 'group',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};
const STATUS_MAP = {
  SCHEDULED: 'scheduled',
  TIMED:     'scheduled',
  IN_PLAY:   'live',
  PAUSED:    'live',
  LIVE:      'live',
  FINISHED:  'finished',
  POSTPONED: 'scheduled',
};

async function main() {
  const token = process.env.FOOTBALL_API_KEY;
  if (!token) {
    console.error('FOOTBALL_API_KEY is required');
    process.exit(2);
  }
  const url = process.env.API_URL || URL_DEFAULT;

  const res = await fetch(url, { headers: { 'X-Auth-Token': token } });
  if (!res.ok) {
    console.error(`api error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const json = await res.json();
  const matches = (json.matches ?? []).map(toMatch).filter(Boolean);
  matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));

  const out = { lastUpdated: new Date().toISOString(), matches };

  let prev = '';
  try { prev = await readFile(OUT_PATH, 'utf8'); } catch {}
  const next = JSON.stringify(out, null, 2) + '\n';
  if (prev === next) {
    console.log('no changes');
    return;
  }
  await writeFile(OUT_PATH, next);
  console.log(`wrote ${matches.length} matches to ${OUT_PATH}`);
}

function toMatch(m) {
  const home = m.homeTeam?.tla;
  const away = m.awayTeam?.tla;
  if (!home || !away) return null;
  return {
    id: String(m.id),
    kickoff: m.utcDate,
    stage: STAGE_MAP[m.stage] ?? 'group',
    group: m.group ? m.group.replace('GROUP_', '') : null,
    home,
    away,
    status: STATUS_MAP[m.status] ?? 'scheduled',
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  };
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run locally to seed `data/results.json`**

```bash
FOOTBALL_API_KEY=<token-from-task-0> node scripts/fetch-results.mjs
```

Expected: prints `wrote 104 matches to data/results.json` (or however many fixtures the API exposes today; placeholder knockouts may still have null `home`/`away` and will be filtered out — that's fine for v1).

If the API returns codes that don't match `teams.json` (e.g. `ENG` vs `GBR`), pause here and reconcile. Edit either `teams.json` or add a tla-mapping table in `fetch-results.mjs` so all match `home`/`away` codes resolve to an entry in `teams.json`.

- [ ] **Step 3: Commit script + seeded data**

```bash
git add scripts/fetch-results.mjs data/results.json
git commit -m "Add fetch-results script and seed results.json from API"
```

---

## Task 20: GitHub Action — 6-hourly refresh

**Files:**
- Create: `.github/workflows/fetch-results.yml`

- [ ] **Step 1: Author the workflow**

```yaml
name: Refresh results

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Fetch latest results
        env:
          FOOTBALL_API_KEY: ${{ secrets.FOOTBALL_API_KEY }}
        run: node scripts/fetch-results.mjs

      - name: Commit if changed
        run: |
          if [[ -n "$(git status --porcelain data/results.json)" ]]; then
            git config user.name  "results-bot"
            git config user.email "results-bot@users.noreply.github.com"
            git add data/results.json
            git commit -m "chore: refresh results [skip ci]"
            git push
          else
            echo "no changes to commit"
          fi
```

- [ ] **Step 2: Push the secret and the workflow**

Manually set the API key as a repo secret named `FOOTBALL_API_KEY`:

```bash
gh secret set FOOTBALL_API_KEY -b "<token-from-task-0>"
```

- [ ] **Step 3: Commit + push the workflow**

```bash
git add .github/workflows/fetch-results.yml
git commit -m "Add GitHub Action to refresh results every 6 hours"
git push
```

- [ ] **Step 4: Trigger a manual run to verify**

```bash
gh workflow run fetch-results.yml
gh run watch
```

Expected: workflow succeeds. If `results.json` was already up to date, the second job step logs "no changes to commit". If new data was fetched, a follow-up commit lands on `main`.

---

## Task 21: GitHub Pages deploy

**Files:** none (configuration only)

- [ ] **Step 1: Create the remote repo if it doesn't exist**

```bash
gh repo create world-cup-sweepstake --public --source=. --remote=origin --push
```

(Skip if you already created it manually; just `git push -u origin main`.)

- [ ] **Step 2: Enable GitHub Pages**

Settings → Pages → Build and deployment → **Source: Deploy from a branch**, **Branch: `main` / root**, save.

Or via CLI:
```bash
gh api -X POST "repos/{owner}/{repo}/pages" -f source.branch=main -f source.path=/
```

- [ ] **Step 3: Verify the site is up**

Within ~2 minutes, `gh repo view --web` opens the Pages URL. Confirm:
- Dashboard renders.
- Timezone toggle works.
- `/draw.html` loads correctly via the Pages URL too.

- [ ] **Step 4: Add the Pages URL to `README.md`**

Modify `README.md`:
```markdown
# World Cup 2026 Sweepstake

🌐 **Live site:** https://<owner>.github.io/world-cup-sweepstake/

…
```

```bash
git add README.md
git commit -m "Add live Pages URL to README"
git push
```

---

## Task 22: Draw day (run with friends) + commit

**Files:**
- Modify: `data/owners.json` (written by the draw)

- [ ] **Step 1: Pre-flight on the live site**

Verify the live Pages site loads `/draw.html` and the dashboard says "The draw hasn't happened yet."

- [ ] **Step 2: Run the draw with friends**

Share screen (or gather), open `/draw.html`, enter the 6 actual names, click Begin the Draw.

- [ ] **Step 3: Download `owners.json` from the draw page**

Commit the downloaded file into the repo:

```bash
cp ~/Downloads/owners.json data/owners.json
git add data/owners.json
git commit -m "Lock in the 2026 sweepstake draw"
git push
```

- [ ] **Step 4: Confirm dashboard now shows the album**

Reload the live site. The pre-draw banner should disappear, replaced by the status strip, the album with all 6 owners and their 8 stickers each, the latest results, and the upcoming fixtures.

---

## Verification checklist (final smoke-test before kickoff)

- [ ] `node --test tests/` → all tests pass
- [ ] Visit the live Pages URL on desktop + mobile → renders correctly
- [ ] Timezone toggle switches all visible times (Latest Results + Up Next + Footer refresh stamp)
- [ ] Album shows 6 owners, 8 stickers each, eliminated teams desaturate + show "OUT" stamp (validated by stubbed data in Task 16)
- [ ] Reloading the live site after a results refresh shows the new `lastUpdated` time in the footer
- [ ] `gh workflow run fetch-results.yml` triggers a successful run

---

## Self-review notes

**Spec coverage:**
- §3 scope (dashboard + draw): Tasks 1, 14, 18 — covered.
- §4 visual + timezone toggle: Tasks 3, 4, 5 — covered.
- §5 stack (vanilla, no build): all tasks comply.
- §6 data model: Tasks 2, 15, 19 — covered.
- §7 draw flow: Task 18 — covered.
- §8 tracking (static + live overlay): Tasks 14, 17 — covered.
- §9 daily refresh: Tasks 19, 20 — covered.
- §10 file layout: matches the file map in the header.
- §11 extensions: no tasks needed (extensions are post-v1).
- §12 error/empty states: Task 14 (pre-draw banner + try/catch in `loadAll`), Task 6 (loader fallbacks).
- §13 testing: Tasks 4, 7 unit tests; Task 16, 18, 21 manual checks.

**Placeholder scan:** No TBDs or "implement later" steps. Open spec decisions (API provider, repo name) are resolved in Tasks 0 and 21 respectively.

**Type consistency check:** Match shape (`id`, `kickoff`, `stage`, `group`, `home`, `away`, `status`, `homeScore`, `awayScore`) is consistent across `standings.js`, `live.js`, `fetch-results.mjs`, and all render modules. Owner shape (`name`, `teams`) is consistent across `data.js`, `app.js`, `album.js`, `draw.js`.
