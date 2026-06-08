# Round-by-round Draw Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second selectable draw mode to `/draw.html` that reveals one team per owner per round, halting on a Next button between rounds for 8 rounds total. Existing "Classic" mode is preserved as the other option.

**Architecture:** Single-file change to `js/draw.js`. The draw page gets a new first screen (mode picker), the names form gains a tiny mode breadcrumb, and the draw runner becomes a thin dispatcher to either `runClassic` (existing behavior, renamed) or `runRoundRobin` (new). Both flows share a single shuffled pool generated once at the start, so the result is deterministic from click-Begin and the rounds are purely presentational.

**Tech Stack:** Vanilla JS (no build step), CSS variables already in place, `crypto.getRandomValues` for shuffling.

**Spec:** `docs/superpowers/specs/2026-06-08-round-robin-draw-design.md`

**Files touched:**

```
js/draw.js          - all logic changes
css/styles.css      - ~12 lines for mode-picker hover + breadcrumb
```

---

## Task 1: CSS additions for mode picker and breadcrumb

**Files:**
- Modify: `css/styles.css` (append to the end)

- [ ] **Step 1: Append the new CSS block at the END of `css/styles.css`**

```css

/* ---------- Draw mode picker ---------- */
.pn-owner.draw-mode-card {
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.pn-owner.draw-mode-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 2px 2px 0 var(--ink);
  border-color: var(--ink);
}
.pn-owner.draw-mode-card .mode-meta {
  font-size: 10px;
  font-style: italic;
  opacity: 0.7;
  margin-top: 6px;
}
.mode-breadcrumb {
  font-size: 10px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.7;
  margin: 8px 0 0;
}
.mode-breadcrumb a { color: var(--maroon); text-decoration: underline; cursor: pointer; }
```

- [ ] **Step 2: Verify the file still parses (no real test — CSS doesn't have one)**

```bash
# Quick check: line count should have grown by ~22 lines from the previous commit.
wc -l css/styles.css
```

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "Add CSS for draw-mode picker cards and breadcrumb"
```

---

## Task 2: Refactor draw.js — extract scaffold + dispatcher

**Files:**
- Modify: `js/draw.js` (lines 55–95, structural refactor — no behavior change)

This task adds zero new features. It restructures the existing `runDraw` body so Task 5 can add `runRoundRobin` without duplicating scaffold code. Classic mode must behave identically after this commit.

- [ ] **Step 1: Replace the `runDraw` function (lines 55–95) with this exact code**

```js
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
```

The Task 5 comment is a deliberate placeholder so the diff for that task is contained. Do not implement `runRoundRobin` in this task — the dispatcher's `mode === 'roundrobin'` branch will be unused/dead code until Task 5 lands. That's fine for one commit; Classic is the default.

- [ ] **Step 2: `node --check js/draw.js`**

Expected empty output.

- [ ] **Step 3: Manual smoke — Classic mode still works**

```bash
lsof -ti :8000 | xargs -r kill 2>/dev/null
python3 -m http.server 8000 >/dev/null 2>&1 &
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/draw.html
curl -s http://localhost:8000/js/draw.js | grep -c "function runClassic" # expect 1
curl -s http://localhost:8000/js/draw.js | grep -c "function renderDrawScaffold" # expect 1
lsof -ti :8000 | xargs -r kill 2>/dev/null
```

Expect: HTTP 200, both grep counts = 1.

Browser-level confirmation that Classic mode hasn't regressed belongs in Task 6's manual smoke.

- [ ] **Step 4: Commit**

```bash
git add js/draw.js
git commit -m "Refactor draw.js: extract renderDrawScaffold and runClassic"
```

---

## Task 3: Mode picker screen

**Files:**
- Modify: `js/draw.js`

Adds the new first screen (two cards) and changes `main()` so a fresh visit lands on the picker instead of the names form.

- [ ] **Step 1: Add `renderModePicker` immediately above the existing `renderForm` function**

```js
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
```

- [ ] **Step 2: Change `main()`'s final line so it shows the picker first**

Find:
```js
  renderForm(teams, initialNames);
```

Replace with:
```js
  renderModePicker(teams, initialNames);
```

- [ ] **Step 3: `node --check js/draw.js`** — expect empty output.

- [ ] **Step 4: Commit**

```bash
git add js/draw.js
git commit -m "Add mode picker as the first /draw screen"
```

---

## Task 4: Pass mode through renderForm + breadcrumb

**Files:**
- Modify: `js/draw.js` (`renderForm`)

- [ ] **Step 1: Replace the entire `renderForm` function with this**

```js
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
```

Note the inner `submitted` variable rename to avoid shadowing the outer `names` parameter (which is needed for the change-mode click handler).

- [ ] **Step 2: `node --check js/draw.js`** — expect empty.

- [ ] **Step 3: Commit**

```bash
git add js/draw.js
git commit -m "Thread mode through renderForm and add change-mode breadcrumb"
```

---

## Task 5: Implement runRoundRobin

**Files:**
- Modify: `js/draw.js`

This is the actual new behavior. Adds `runRoundRobin` and removes the placeholder comment from Task 2.

- [ ] **Step 1: Replace the `// runRoundRobin is added in Task 5` comment with this function**

```js
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
```

- [ ] **Step 2: `node --check js/draw.js`** — expect empty.

- [ ] **Step 3: Commit**

```bash
git add js/draw.js
git commit -m "Add round-by-round draw mode with Next-round halt"
```

---

## Task 6: End-to-end manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
lsof -ti :8000 | xargs -r kill 2>/dev/null
python3 -m http.server 8000 >/dev/null 2>&1 &
sleep 1
```

- [ ] **Step 2: Verify all relevant assets respond**

```bash
for f in draw.html js/draw.js css/styles.css data/teams.json; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/$f")
  echo "$code $f"
done
```

Expect all four 200.

- [ ] **Step 3: Browser-level verification (manual — open in actual browser)**

Open `http://localhost:8000/draw.html`. Confirm in order:

1. Mode picker shows two cards: "Classic" and "Round-by-round". Each has the helper line.
2. Click "Classic" → names form appears with breadcrumb `Mode: Classic · change`.
3. Click the `change` link → back at mode picker.
4. Pick "Round-by-round" → names form shows `Mode: Round-by-round · change`.
5. Click "Begin the Draw" with 6 default names.
6. After the 6th owner gets a team in round 1, animation halts. A `Next round (2 / 8)` button appears centered below the owner grid.
7. Click through rounds 2 → 8. Confirm the round label updates and the button text increments to 3/8, 4/8 … 8/8.
8. After round 8 there is NO next-round button — instead the Draw Complete screen appears with the 3 export buttons.
9. Open DevTools console and run:

```js
document.querySelectorAll('.pn-owners .pn-sticker').length === 48
```

Expect `true`.

10. Hit `Redo draw` → returns to mode picker (not the names form). Pick "Classic" → confirm the original sequential behavior is intact (owner 1 fills entirely before owner 2 starts). Verify it ends on the Draw Complete screen with the correct 48-sticker total.

- [ ] **Step 4: Stop the server**

```bash
lsof -ti :8000 | xargs -r kill 2>/dev/null
```

- [ ] **Step 5: If anything failed above, STOP and report. If everything passed, no commit needed (verification only).**

---

## Self-review notes

**Spec coverage:**
- §2 user flow — Tasks 3 (picker), 4 (breadcrumb), 5 (round-robin), 6 (verification of full flow).
- §3 Classic mode unchanged — guaranteed by Task 2 refactor + Task 6 step 10.
- §3 Round-by-round mode — Task 5.
- §3 single pool shuffled once — `runDraw` in Task 2 shuffles before dispatch; both flows pop from the same pool.
- §4 code structure — file map matches: `renderModePicker`, modified `renderForm`, `runDraw` dispatcher, `runClassic`, `runRoundRobin` all named per spec.
- §5 URL hash unchanged — `writeHash`/`readHash` are untouched.
- §6 owners.json shape — `result` is built identically in both paths.
- §7 mode picker visual — Tasks 1 (CSS) + 3 (markup).
- §8 edge cases — refresh handling unchanged because `main()` still routes to picker (no hash) or `renderResult` (hash present); Next button only appears post-round so the "click during animation" case is structurally prevented.
- §9 testing — Task 6 covers all 9 manual checks except cleanly testing the change-mode breadcrumb's name-preservation behavior, which is acceptable to skip (spec §8 already notes names may need re-entry).
- §10 out-of-scope items — confirmed absent from all tasks.

**Placeholder scan:**
- The Task 2 `// runRoundRobin is added in Task 5` placeholder is intentional and removed in Task 5. Not a plan failure.
- No TBDs elsewhere.

**Type consistency:**
- `mode` string is `'classic'` or `'roundrobin'` everywhere. `MODE_LABELS` keys match.
- `runDraw(teams, names, mode)`, `runClassic(pool, result)`, `runRoundRobin(pool, result)`, `renderDrawScaffold(teams, names)`, `renderForm(teams, names, mode)`, `renderModePicker(teams, names)` — signatures consistent across Tasks 2–5.
- `waitForNextRound(nextRound, total)` defined in Task 5, called in Task 5. Local to that file. No cross-task references.
