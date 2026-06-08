# Extract Shared Render Utilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the copy-pasted `escape()`, `ownerTag()`, and `flag()` helpers from five render files into a single `js/utils.js` module so future render modules (added in v1.5) can import them cleanly.

**Architecture:** Create one new file (`js/utils.js`) with the three shared helpers, then update each of the five existing callers to import from it and delete their local copies. No logic changes — purely structural.

**Tech Stack:** Vanilla ES modules (no bundler, no npm). Tests run with `node --test`.

---

### Task 1: Create `js/utils.js`

**Files:**
- Create: `js/utils.js`

- [ ] **Step 1: Create the file with the three helpers**

```js
export function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}

export function flag(t) {
  return t?.flag ?? '🏳️';
}
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

```bash
node -e "import('./js/utils.js').then(m => console.log(Object.keys(m)))"
```

Expected output: `[ 'escape', 'ownerTag', 'flag' ]`

- [ ] **Step 3: Commit**

```bash
git add js/utils.js
git commit -m "feat: add shared render utilities (escape, ownerTag, flag)"
```

---

### Task 2: Update `js/render/results.js`

**Files:**
- Modify: `js/render/results.js`

`results.js` defines its own `escape`, `ownerTag`, and `flag` — all three to remove.

- [ ] **Step 1: Add the import and remove the local helpers**

Replace the top of the file:

```js
import { formatMatchDateTime } from '../tz.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, ownerTag, flag } from '../utils.js';
```

Remove these three functions from the bottom of the file (they'll be dead code once the import is in place):

```js
function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}
function flag(t) { return t?.flag ?? '🏳️'; }
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
node --test
```

Expected: all tests pass (the render modules aren't unit tested, but standings and tz tests must still be green).

- [ ] **Step 3: Commit**

```bash
git add js/render/results.js
git commit -m "refactor: import shared utils in render/results.js"
```

---

### Task 3: Update `js/render/upcoming.js`

**Files:**
- Modify: `js/render/upcoming.js`

Same three helpers to remove.

- [ ] **Step 1: Add the import and remove the local helpers**

Replace the top of the file:

```js
import { formatMatchDateTime } from '../tz.js';
import { teamByCode, ownerForTeam } from '../data.js';
import { escape, ownerTag, flag } from '../utils.js';
```

Remove these three functions from the bottom:

```js
function ownerTag(name) {
  return name ? `<span class="pn-owner-tag">${escape(name)}</span>` : '';
}
function flag(t) { return t?.flag ?? '🏳️'; }
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Run existing tests**

```bash
node --test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add js/render/upcoming.js
git commit -m "refactor: import shared utils in render/upcoming.js"
```

---

### Task 4: Update `js/render/album.js`

**Files:**
- Modify: `js/render/album.js`

`album.js` only defines `escape` locally (no `ownerTag` or `flag`).

- [ ] **Step 1: Add the import and remove the local helper**

Replace the top of the file:

```js
import { isAlive } from '../standings.js';
import { teamByCode } from '../data.js';
import { escape } from '../utils.js';
```

Remove this function from the bottom:

```js
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 2: Run existing tests**

```bash
node --test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add js/render/album.js
git commit -m "refactor: import shared utils in render/album.js"
```

---

### Task 5: Update `js/draw.js`

**Files:**
- Modify: `js/draw.js`

`draw.js` is loaded as an ES module via `<script type="module" src="js/draw.js"></script>` in `draw.html:13` (verified 2026-06-08). It has no `import` statements only because it hasn't needed any yet — it can use `import` freely.

- [ ] **Step 1: Add the import**

Add at the top of `js/draw.js`:

```js
import { escape } from './utils.js';
```

- [ ] **Step 2: Remove the local `escape`**

Delete the local `escape` function at the bottom of `js/draw.js`:

```js
function escape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 3: Run existing tests**

```bash
node --test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/draw.js
git commit -m "refactor: import shared utils in draw.js"
```

---

### Task 6: Update `js/app.js`

**Files:**
- Modify: `js/app.js`

`app.js` defines its own `escapeHtml` (note: slightly different name). Check whether it's used anywhere or can be replaced with the shared `escape`.

- [ ] **Step 1: Check how escapeHtml is used in app.js**

```bash
grep -n 'escapeHtml\|escape' js/app.js
```

It is used only in the catch block: `` `Couldn't load tournament data — ${escapeHtml(err.message)}` ``. It is safe to replace with the shared `escape`.

- [ ] **Step 2: Add the import and replace escapeHtml**

Add to the imports at the top of `js/app.js`:

```js
import { escape } from './utils.js';
```

Replace the one usage site — change:

```js
root.innerHTML = `<p class="error">Couldn't load tournament data — ${escapeHtml(err.message)}</p>`;
```

to:

```js
root.innerHTML = `<p class="error">Couldn't load tournament data — ${escape(err.message)}</p>`;
```

Remove the local function at the bottom of `js/app.js`:

```js
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 3: Run existing tests**

```bash
node --test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "refactor: import shared utils in app.js, remove escapeHtml duplicate"
```

---

### Task 7: Final smoke test

- [ ] **Step 1: Run the full test suite one more time**

```bash
node --test
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Verify no local escape/ownerTag/flag functions remain in render files**

```bash
grep -rn 'function escape\|function ownerTag\|function flag\|function escapeHtml' js/
```

Expected output: only `js/utils.js`. No hits in `js/draw.js`, any `render/` file, or `app.js`.

- [ ] **Step 3: Open the dashboard in a browser and confirm it loads without console errors**

Open `index.html` via a local server (e.g. `npx serve .` or `python3 -m http.server`) and check the browser console. No errors expected.
