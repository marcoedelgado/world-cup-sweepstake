# v1.5 Post-Group-Stage Features — Design

**Status:** Draft, awaiting user review
**Author:** Marco Delgado + Claude
**Date:** 2026-06-08
**Builds on:** `2026-06-08-world-cup-sweepstake-design.md`
**Target ship:** Before R32 begins (~2026-06-28)

---

## 1. Goal

Extend the live dashboard so the experience evolves as the tournament moves from groups into knockouts. Four additive features, each independently toggleable via a feature flag:

| Feature | Where it lives |
|---|---|
| **A. Playoff bracket** | New `/bracket.html`, linked from footer |
| **B. Heat Check transform** | Album section on `/`, swaps in once all group matches are finished |
| **C. Group standings tables** | New collapsible section on `/`, between Album and Latest Results |
| **D. Per-owner detail page** | New `/owner.html?name=X`, reached by tapping an owner card |

All four share one design principle: **drop-in, drop-out**. Each feature is one isolated render module + one flag in `js/config.js`. Removing a feature means flipping a flag and (optionally) deleting one file. Modifying a feature means editing one file with no risk to others.

## 2. Feature flags — `js/config.js`

```js
export const FEATURES = Object.freeze({
  bracket:        true,   // /bracket.html linked from footer
  transformAlbum: true,   // Album becomes "Heat Check" post-group-stage
  groupStandings: true,   // Collapsible standings section on dashboard
  ownerDetail:    true,   // Owner cards link to /owner.html
});
```

`app.js` is the single place that reads each flag and decides whether to invoke the corresponding renderer. Render modules themselves never check flags — they assume they were invoked because they should run.

`config.js` is a JS module (not JSON) so we get an import-time error if it's missing or malformed, rather than a silent runtime fetch failure. Future flags slot in by adding one line.

## 3. Phase detection — `js/phase.js`

A small new module that derives the tournament phase from `results.json`:

```js
export function tournamentPhase(matches) {
  const groupMatches = matches.filter((m) => m.stage === 'group');
  const allGroupFinished = groupMatches.length === 72
    && groupMatches.every((m) => m.status === 'finished');
  return allGroupFinished ? 'knockout' : 'group';
}
```

Returns `'group'` or `'knockout'`. Cheap to compute, called once during dashboard bootstrap.

Three features key off this:

- **B (Heat Check)** activates when `phase === 'knockout'` (and `FEATURES.transformAlbum`).
- **A (Bracket footer link)** is shown when `phase === 'knockout'`. The bracket page itself is always reachable at `/bracket.html` regardless of phase; the dashboard footer just hides the link until knockouts begin so it doesn't tease an empty page.
- **C (Standings)** is always shown if its flag is on, regardless of phase. Tables are useful during groups and as historical reference after.

Unit test: 3 cases in `tests/phase.test.mjs` — empty results, partial group stage, all groups finished.

## 4. Data model additions

### 4.1 `data/results.json` — add R32 stage

The 48-team 2026 format introduces a Round-of-32 stage (16 matches) before R16. The current `STAGE_MAP` in `scripts/fetch-results.mjs` doesn't have it:

```js
const STAGE_MAP = {
  GROUP_STAGE: 'group',
  ROUND_OF_32: 'r32',        // NEW
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: 'third',
  FINAL: 'final',
};
```

Match `stage` values in `results.json` therefore become: `group | r32 | r16 | qf | sf | third | final`.

### 4.2 No schema changes elsewhere

`teams.json` and `owners.json` are untouched. The bracket and owner pages compute everything they need from the existing data.

## 5. Feature A — Playoff bracket page

### 5.1 File layout

```
bracket.html
js/bracket.js                   # bootstrap (fetch data, call renderer)
js/render/bracket-render.js     # render the bracket itself
css/styles.css                  # new section: /* ---------- Bracket ---------- */
```

### 5.2 Desktop layout (≥ 700px)

Five columns side-by-side, left to right: **R32 · R16 · QF · SF · Final**. Each column is a vertical stack of match cells. Cell count per column: 16 · 8 · 4 · 2 · 1. The third-place playoff renders as a single match card in a sixth, narrower trailing column labelled "3rd place" — visually separated from the Final by a small gap so it reads as adjunct, not part of the main bracket.

Each cell shows:
- Both teams (flag sticker + 3-letter code + owner tag)
- Score on the right of each team
- Losing team strikes through and fades
- Kickoff time below the scores (until finished)

Connecting lines between rounds are rendered via CSS pseudo-elements on each cell — no SVG. Lines are decorative; the layout reads cleanly without them. Lines do not render below 700px (mobile reflow described in 5.3).

Page-level header: reuses `renderHeader()` so the TZ toggle works identically on the bracket page.

### 5.3 Mobile pattern (< 700px)

Below 700px, the bracket becomes a horizontal-snap carousel: one round fills the viewport, the user swipes left/right or taps a round tab at the top.

```html
<div class="br-tabs">
  <button class="br-tab active">R32</button>
  <button class="br-tab">R16</button>
  <button class="br-tab">QF</button>
  <button class="br-tab">SF</button>
  <button class="br-tab">🏆</button>
</div>
<div class="br-scroll">
  <section class="br-round">...R32 cells...</section>
  <section class="br-round">...R16 cells...</section>
  ...
</div>
```

CSS uses `scroll-snap-type: x mandatory` on `.br-scroll` and `scroll-snap-align: start` on `.br-round`. Tab clicks call `scrollIntoView({behavior:'smooth'})`. The "active" tab updates on scroll via an `IntersectionObserver` watching the round sections.

No JS scroll-position polling, no library. ~30 lines of JS.

### 5.4 Empty / pre-knockout state

If `phase === 'group'`, the page shows a centred "The knockouts haven't started yet. First R32 match: <date · time>" card instead of empty cells. Once R32 has fixtures with kickoff times committed in `results.json`, the bracket cells render with TBD team placeholders until the group stage resolves.

### 5.5 Linked from dashboard

In the dashboard footer (`render/footer.js`), add:

```js
if (FEATURES.bracket && phase === 'knockout') {
  // append "View the bracket →" link
}
```

The bracket page is always reachable at `/bracket.html` directly — the conditional just controls whether the dashboard advertises it.

## 6. Feature B — Heat Check transform

### 6.1 What changes

When `phase === 'knockout'` and `FEATURES.transformAlbum`, the Album section on `/` becomes:

- **Title** changes to **"The Album · Heat Check"**
- **Layout** changes from 2-col (34×44 stickers, wrap) to 3-col (30×38 stickers, single line per card)
- **Owner order** re-sorts by descending alive count; tiebreaker is the original draw order (the order in `owners.json`)
- **🔥 prefix** added before owner names with ≥ 1 alive team
- **Owners with 0 alive** show name + count in muted red with a soft strikethrough on the name
- **Owner cards become clickable** (handled by Feature D, not B — these features stack)

### 6.2 Layout details

3-column CSS grid on desktop (`>700px`), 1-column on mobile. Each card:

- `padding: 10px 12px`
- Name + alive count row (margin-bottom: 8px)
- Single row of 8 stickers via `display:flex; flex-wrap:nowrap; justify-content:space-between`
- Stickers at 30×38 (chosen because 8 × 34 + gaps doesn't fit in 3-col at 900px page width)
- Hover state: lift + 2px-2px hard shadow (same hover pattern as draw-mode cards)

### 6.3 Group-stage Album unchanged

The transformation **only** runs post-group-stage. During the group stage (and pre-tournament), the Album renders as today: 2-col, 34×44 stickers, wrap. No flag flip needed — `phase === 'group'` simply skips the transform path.

### 6.4 Render module

`js/render/album.js` exposes two render functions: `renderAlbumGroup(owners, teams)` and `renderAlbumHeat(owners, teams, results)`. `app.js` picks which to call based on `phase` + `FEATURES.transformAlbum`. If the flag is off, `renderAlbumGroup` always runs regardless of phase.

This split is intentional — they're visually distinct enough that one function with branches would be harder to read. Pulling them apart also means deleting Heat Check later = deleting one function.

## 7. Feature C — Group standings tables

### 7.1 Placement

New section on `/`, immediately between Album and Latest Results. Collapsed by default: a single button reading **"▸ Show group standings"**. Expanding reveals a 3-column grid of 12 mini tables (one per group).

The collapsed state is persistent — `localStorage` key `sweep26.standingsOpen` (`'true'` / `'false'`). First-time visitors see it collapsed.

### 7.2 Mini table layout

Each group card shows:
- Group title (italic, maroon) — "Group A"
- Compact table: `| | Team | P | GD | Pts |`
  - First column: ✓ (green) for qualified, ✗ (red) for eliminated, blank if still TBD mid-group-stage
  - Team column: 22×28 mini sticker + team name (truncated if needed)
  - P / GD / Pts: right-aligned, small caps headers
- Rows reorder per FIFA tiebreakers (already implemented in `standings.js`)

W/D/L are intentionally omitted from this compact view — pts and GD are the headline numbers. Full record per team is available on the owner detail page (Feature D).

### 7.3 Render module

`js/render/standings-section.js` — single function `renderStandingsSection(teams, results, container)`. Internally calls `computeStandings()` from `standings.js` for each of the 12 groups. Mounts the expand/collapse button and 12 group cards.

### 7.4 Mobile

`< 700px`: grid collapses to 1 column. 12 tables stack vertically. The expand/collapse toggle still works the same way.

## 8. Feature D — Per-owner detail page

### 8.1 File layout

```
owner.html
js/owner.js                     # bootstrap: parse ?name=, fetch data, call renderer
js/render/owner-detail.js       # render the detail page
css/styles.css                  # new section: /* ---------- Owner detail ---------- */
```

### 8.2 Navigation

When `FEATURES.ownerDetail`, the dashboard's owner cards in `render/album.js` render as `<a href="owner.html?name=${name}">` anchors instead of `<div>`s. A small chevron `›` appears top-right of each card. Hover lifts the card with the same hard-shadow effect used elsewhere.

When the flag is off, owner cards render as plain `<div>` with no chevron — no other visual change.

### 8.3 Page layout

Reuses the dashboard's header/footer (TZ toggle remains in place). Cover block shows owner name + headline alive count (e.g. "Marco · 4 of 8 alive"). Below: one row per team, sorted by status (alive first, then eliminated). Each row:

```
[sticker]  Brazil          3W 0D 0L · +6 GD       → vs URU · R16 · Sat 18:00
[sticker]  Netherlands     2W 1D 0L · +3 GD       → vs CRO · R16 · Sun 16:00
[sticker]  Mexico          2W 1D 0L · +5 GD       → vs JPN · R16 · Mon 18:00
[sticker]  USA             2W 0D 1L · +1 GD       → vs ESP · R16 · Mon 22:00
─────────────────────────────────────────────────────────────────────────────
[sticker]  Iran            0W 1D 2L · -3 GD       eliminated · 3rd in F
[sticker]  Ivory Coast     0W 1D 2L · -2 GD       eliminated · 3rd in E
...
```

Records are computed inline from `results.json`. The "next match" column shows the upcoming fixture (group stage match or knockout opponent + round + kickoff). Eliminated teams show "eliminated · {how}" instead.

Below 700px the row reflows: sticker + team name on top line, record + next match on a second line, separator unchanged.

A back link at the top reads **"← Back to the album"**.

### 8.4 Unknown name handling

If `?name=` is missing or doesn't match any owner in `owners.json`, render a "No such owner. <a>Back to the album</a>" card. No 404, no broken state.

### 8.5 No flag-dependent rendering on this page

`owner.html` doesn't read any feature flags itself. If someone reaches it directly while `FEATURES.ownerDetail` is `false`, the page still works — it just isn't linked from anywhere. This is intentional (drop-in/drop-out: removing the feature means flipping a flag and optionally deleting `owner.html` + the two JS files).

## 9. File layout — what's added

```
/
├── bracket.html                            # NEW
├── owner.html                              # NEW
├── css/
│   └── styles.css                          # +sections for each feature
├── js/
│   ├── config.js                           # NEW (feature flags)
│   ├── phase.js                            # NEW (group vs knockout)
│   ├── bracket.js                          # NEW (bracket page bootstrap)
│   ├── owner.js                            # NEW (owner detail bootstrap)
│   └── render/
│       ├── album.js                        # +renderAlbumHeat function
│       ├── bracket-render.js               # NEW
│       ├── owner-detail.js                 # NEW
│       └── standings-section.js            # NEW
├── scripts/
│   └── fetch-results.mjs                   # +ROUND_OF_32 in STAGE_MAP
└── tests/
    ├── phase.test.mjs                      # NEW
    └── standings.test.mjs                  # existing, no changes
```

Net new files: 6. Modified files: 4 (`app.js`, `render/album.js`, `render/footer.js`, `fetch-results.mjs`). Plus the existing render modules pick up small additions where flags are checked.

## 10. CSS organisation

`css/styles.css` adds four labelled sections, each easy to find or excise:

```css
/* ---------- Heat Check (transformed album) ---------- */
.pn-owners.heat { grid-template-columns: 1fr 1fr 1fr; }
.pn-owners.heat .pn-owner { ... }
.pn-owners.heat .pn-sticker { width: 30px; height: 38px; }

/* ---------- Group standings ---------- */
.pn-standings { ... }
.pn-standings.collapsed .pn-standings-grid { display: none; }

/* ---------- Bracket ---------- */
.br-page { ... }
.br-round { ... }
.br-cell { ... }
@media (max-width: 700px) { .br-scroll { scroll-snap-type: x mandatory; } }

/* ---------- Owner detail ---------- */
.owner-page { ... }
.owner-team-row { ... }
```

No CSS reorganisation of existing sections. Tokens (--paper, --ink, --maroon, --gold, --shadow) are reused unchanged.

## 11. Testing approach

Per the v1 spec, automated tests are limited to pure-function modules. v1.5 adds:

- **`tests/phase.test.mjs`** — `tournamentPhase()` with 3 fixture cases (empty, partial, complete).
- Standings tests already cover `computeStandings`, which feeds Feature C — no new tests needed there.
- Render modules (bracket, heat check, owner detail) are DOM-bound and not unit tested. They are smoke-tested manually on `data/results.json` + a test `data/owners.json` while developing.
- Bracket mobile-swipe is verified manually at < 700px width.

The future Playwright suite (v1.6) will cover bracket scroll-snap, owner-card click, standings expand/collapse, and Heat Check transition by stubbing a `results.json` in each phase.

## 12. Manual smoke-test plan

Before merging:

1. Dashboard loads pre-knockout (current data) — Album shows 2-col, 34×44, no Heat Check.
2. Stub `results.json` so all 72 group matches are `finished` — Album re-renders as 3-col Heat Check, owners re-sorted by alive count, 🔥 prefixes appear, 0-alive owners struck through.
3. Footer shows "View the bracket →" link in knockout phase, hidden in group phase.
4. `/bracket.html` renders 5 columns of cells on desktop. Lines connect rounds visually.
5. Resize to mobile width — bracket becomes swipeable carousel, round tabs at top, scroll-snap engages.
6. Tap an R32 cell — no navigation (cells aren't links). Confirms the bracket is read-only.
7. Click an owner card — navigates to `/owner.html?name=marco`. Detail page renders with all 8 teams sorted alive-first.
8. Manually edit URL to `/owner.html?name=bogus` — sees "No such owner" card.
9. Standings section starts collapsed; click "Show group standings" — 12 group cards render; refresh — state persists.
10. Toggle each `FEATURES.*` flag to `false` one at a time — corresponding feature vanishes cleanly, dashboard still renders, no console errors.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Football-data.org doesn't emit `ROUND_OF_32` until R32 fixtures are scheduled | Verify by inspecting an unrelated 48-team competition response; fall back to leaving `r32` matches as TBD until the API populates them. The `warnIfOrphanCodes` logger already catches unmapped TLAs; similar pattern would catch unmapped stages. |
| Re-sorting owners in Heat Check is jarring after seeing them in draw order during groups | Re-sort is the dramatic point of the transform. Counter-tested in the mockup; user approved. Tie-break stays as original draw order so equal-alive owners don't shuffle. |
| Bracket scroll-snap behaviour varies across browsers | iOS Safari and Android Chrome are the two we care about; both have shipped scroll-snap-type since 2019. Tested manually on real devices before kickoff. |
| Owner detail page exposes data already on the dashboard — feels redundant | Worth it once owners have lots of dead teams + a couple of live ones; the dashboard's compact view doesn't surface per-team records. The flag lets us pull the page if it turns out unused. |
| Standings section on dashboard pushes Latest Results / Up Next below the fold | Collapsed by default. Most visits won't expand it. |

## 14. Out of scope

- **Predictions / side-bets**: still deferred. Would need a new `data/predictions.json` and a richer UI flow.
- **Match detail page** (`/match.html?id=…`): not needed; the dashboard + bracket already give enough context per match.
- **Push notifications / live ticker**: live overlay already covers in-progress matches; nothing more is planned for v1.5.
- **Bracket interactivity** (predict-who-wins, vote): bracket is read-only.
- **Schedule calendar** (`/schedule.html`): still deferred. Up Next on the dashboard suffices for the immediate horizon.
- **Playwright user-flow tests**: deferred to v1.6 (after v1.5 ships and stabilises).

---

End of design.
