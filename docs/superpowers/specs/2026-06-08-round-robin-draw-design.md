# Round-by-round Draw Mode — Design

**Status:** Draft, awaiting user review
**Author:** Marco Delgado + Claude
**Date:** 2026-06-08
**Builds on:** `2026-06-08-world-cup-sweepstake-design.md`

---

## 1. Goal

Add a second, more dramatic draw mode to `/draw.html` while keeping the existing flow. New "Round-by-round" mode pulls one team per owner per round, then halts until the group clicks a "Next round" button. Repeats for 8 rounds, ending with the same Draw Complete screen.

The existing "Classic" mode (all 8 teams to one owner before moving on) is preserved as an explicit option.

## 2. User flow

1. Open `/draw.html`.
2. **Mode picker screen** (new). Two cards in the existing `.pn-owners` 2-column layout:
   - **Classic** — "All 8 in one go" — subtitle "~3–4 minutes."
   - **Round-by-round** — "One each, click Next, repeat 8 times" — subtitle "8 rounds, as long as the group wants."
   - Each card has the Panini look (cream + gold gradient, hard black border, offset shadow). Click selects the mode and advances.
3. **Names form** (unchanged structurally). 6 name inputs pre-filled from `data/owners.json` placeholders. New breadcrumb above the form: `Mode: Round-by-round · change` where `change` returns to step 2.
4. **Begin the Draw** → enters the chosen execution path.
5. **Draw Complete screen** — identical for both modes. Download `owners.json`, copy share link, redo.

## 3. Execution

### Classic mode (existing behavior, unchanged)

Outer loop over owners; inner loop reveals 8 teams per owner with `REVEAL_DELAY_MS` between picks and `POST_OWNER_PAUSE_MS` between owners. Total runtime ≈ 48 × 350 ms + 5 × 600 ms ≈ 20 s.

### Round-by-round mode (new)

8 rounds. In each round:

1. The "drawing for…" subtitle updates: `Round N · Drawing for Sam…` etc.
2. Cycle through owners in entered order. For each owner, pop one team from the shuffled pool, animate into their card, decrement pool, `REVEAL_DELAY_MS` between owners.
3. After the 6th owner of the round gets their team, halt. Render a centered button: `Next round (N+1 / 8)`.
4. On click: hide the button, run round N+1.
5. After round 8: button is not rendered. Fall through to the Draw Complete screen (same code path as Classic).

Owner order within each round is **fixed** (entered order). Random assignment makes snake-draft unnecessary; deterministic ordering keeps the experience predictable for everyone.

Pool randomness is generated **once** before round 1 (one Fisher-Yates shuffle of all 48 teams using `crypto.getRandomValues`). Each round simply pops 6 teams off the shuffled pool in sequence. This guarantees no team can appear twice and means the entire result is determined the moment the user clicks Begin — the round-by-round reveal is purely presentational.

## 4. Code structure

All changes in `js/draw.js`. No CSS additions, no new files.

```js
// New
async function renderModePicker(teams) { ... }   // step 2 above
function modeBreadcrumb(mode) { ... }            // small UI helper

// Modified signatures
function renderForm(teams, names, mode) { ... }  // adds mode argument + breadcrumb
async function runDraw(teams, names, mode) { ... } // dispatches to runClassic / runRoundRobin

// Renamed (was the body of the existing runDraw)
async function runClassic(teams, names) { ... }

// New
async function runRoundRobin(teams, names) { ... }
```

Shared helpers — `shuffle`, `hideFromPool`, `addToOwnerCard`, `updateOwnerCount`, `stickerHtml`, `delay`, `escape`, `cssEscape`, `readHash`, `writeHash`, `downloadJson`, `renderResult` — are unchanged and reused by both execution paths.

State carried between rounds (`runRoundRobin` only): the shuffled `pool` array, the `result` object being built, and the current round index. All scoped to the function via closure, no module-level state.

## 5. URL hash and persistence

The result encoding into `location.hash` (`#draw=<base64>`) and the `readHash` recovery path are unchanged. A draw is completed only after round 8 (or after Classic finishes); the hash is written at that point, identical to today. Refreshing mid-draw in either mode loses the in-progress state and returns to the mode picker — same as today's behavior of refreshing mid-Classic.

The chosen mode is **not** persisted across reloads. If a friend refreshes the page mid-draw, they see the mode picker again. Acceptable for a one-time-use page run with the group.

## 6. Owners.json shape — unchanged

```json
{
  "drawCompletedAt": "2026-06-10T19:30:00Z",
  "owners": [
    { "name": "Marco", "teams": ["BRA", "ESP", "ARG", "GER", "SEN", "JPN", "FRA", "PAR"] },
    ...
  ]
}
```

The dashboard, the export, and the share-link encoding don't know or care which mode produced the file. This is the key isolation property: the new mode is an animation choice only.

## 7. Mode picker visual

Reuses existing components:

- Outer: `<main class="pn">`
- Cover: same `.pn-cover` block, title "The Draw" / subtitle "Pick a mode"
- Card grid: `<div class="pn-owners">` with 2 children styled as `.pn-owner`
- Each card has a heading (`.pn-owner-name`) plus a paragraph
- Cards have `cursor: pointer` and a hover transform identical to the existing toggle buttons — a single small `<style>` addition or an inline `:hover` CSS rule. Prefer adding to `css/styles.css` under a new `/* ---------- Draw mode picker ---------- */` section, ~6 lines.

## 8. Error and edge cases

- **User refreshes mid-draw:** lands on mode picker. Already-rendered DOM is gone. Same as today's mid-Classic refresh — no regression.
- **User clicks Next round before owners finish animating:** Next button is only rendered AFTER the 6th owner of a round receives their team, so this is structurally impossible.
- **8-round count drift:** the round counter is sourced from a single variable; UI label and termination check share it.
- **Backward navigation from names → mode picker via the breadcrumb "change" link:** simply re-renders the picker. Names are not preserved across this transition (rare; acceptable to retype).

## 9. Testing

Manual checks on `/draw.html`:

1. Load `/draw.html` → mode picker appears with two cards.
2. Click Classic → names form appears with `Mode: Classic · change` breadcrumb.
3. Click `change` → back at mode picker.
4. Pick Round-by-round → names form → Begin.
5. Verify after each round: animation halts, Next button shows correct round count (`Next round (2 / 8)` etc.).
6. Click through all 8 rounds → Draw Complete screen.
7. Confirm `owners.json` download has 6 owners × 8 teams = 48 unique team codes.
8. Reload the result-URL hash → `renderResult` renders the same allocation.
9. Pick Classic from a fresh load → confirm identical behavior to today (no regression).

No new unit tests. `runClassic` and `runRoundRobin` are DOM-bound animation paths not easily unit-testable; `shuffle` is shared and was implicitly tested via the original draw page.

## 10. Out of scope

- Snake-draft owner ordering (round 2 reverses owner order). Random assignment makes the symmetry purely cosmetic; not worth the code.
- Persisting mode choice across reloads.
- Persisting mid-draw state across reloads.
- Multi-page draw (each round on its own URL).
- Sound effects.
- Mode picker on the dashboard (`/`). Picker only lives on `/draw.html`.

---

End of design.
