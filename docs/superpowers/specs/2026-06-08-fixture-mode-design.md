# Fixture Mode Design

**Date:** 2026-06-08  
**Status:** Approved

## Problem

Developers need a way to preview the site at known tournament states (group stage mid-way, group stage complete, knockout rounds) without touching `data/results.json` or relying on the simulate script's destructive write-then-revert workflow.

## Solution

Add a `?fixture=<name>` query param that redirects data loading to pre-committed snapshot files, and display a prominent banner so it's always obvious when fixture data is active.

---

## Fixture Files

**Location:** `data/fixtures/`

**Files (one per simulate phase):**

| File | Phase flag |
|------|-----------|
| `data/fixtures/group-mid.json` | `--phase=group-mid` |
| `data/fixtures/group-full.json` | `--phase=group-full` |
| `data/fixtures/knockouts-r32.json` | `--phase=knockouts-r32` |
| `data/fixtures/knockouts-r16.json` | `--phase=knockouts-r16` |

These are committed to the repo and regenerated on demand via a generator script.

---

## Generator Script

**`scripts/generate-fixtures.mjs`** — thin wrapper that runs simulate-tournament for each phase, writing output to `data/fixtures/<phase>.json` instead of `data/results.json`.

- Reads `data/teams.json` (same as simulate)
- Runs all four phases sequentially
- Prints a summary line per file written
- Safe to re-run at any time; files are always overwritten

---

## `js/data.js` Changes

Add fixture-mode detection at module load time:

```js
const FIXTURE_NAMES = new Set(['group-mid', 'group-full', 'knockouts-r32', 'knockouts-r16']);
const _param = new URLSearchParams(window.location.search).get('fixture');
export const fixtureMode = FIXTURE_NAMES.has(_param) ? _param : null;
```

When `fixtureMode` is set, `loadAll()` fetches `data/fixtures/<fixtureMode>.json` instead of `data/results.json`.

Unknown `?fixture=` values are silently ignored (fall back to real data) — no error thrown.

---

## TEST DATA Banner

When `fixtureMode` is non-null, a full-width sticky banner is rendered at the top of every data-loading page.

**Copy:** `TEST DATA — fixture: <name>`  
**Style:** amber/orange background, dark text, full width, no dismiss button (it's a local dev tool)  
**Placement:** inserted as the very first child of `#app`, before `renderHeader`  
**Implementation:** a `renderFixtureBanner(root, fixtureMode)` helper called from each `main()` / `paint()` function

---

## Live Match Fetch

When fixture mode is active, `fetchLiveMatches()` is skipped entirely. There is no point overlaying real live scores onto simulated data.

This is controlled in `app.js`: the `fetchLiveMatches().then(...)` block is gated on `!fixtureMode`.

---

## Pages Affected

| Page | Entry point | Change needed |
|------|-------------|---------------|
| `index.html` | `app.js` | fixture banner + skip live fetch |
| `bracket.html` | `bracket.js` | fixture banner |
| `owner.html` | `owner.js` | fixture banner |
| `draw.html` | `draw.js` | none — uses raw fetch, not `data.js` |

---

## Usage

```
# Local dev server running at localhost:3000
index.html?fixture=group-mid
index.html?fixture=knockouts-r16
bracket.html?fixture=group-full
owner.html?fixture=knockouts-r32
```

---

## Out of Scope

- No fixture switcher UI on the page
- No support for `?fixture=` on `draw.html`
- No owners fixture override — `data/owners.json` is always real
