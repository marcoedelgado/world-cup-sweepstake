# World Cup 2026 Sweepstake — Design

**Status:** Draft, awaiting user review
**Author:** Marco Delgado + Claude
**Date:** 2026-06-08
**Target ship:** Before 2026-06-11 kickoff (3 days)

---

## 1. Goal

Build a small, fun, visual GitHub Pages site for a 6-friend World Cup 2026 sweepstake. Two phases:

1. **Draw day** — perform the random team allocation live in the browser, then commit the result to the repo.
2. **During the tournament** — show ownership, live and recent results, upcoming matches.

Constraint: **simple and easy to extend.** Vanilla static site, no build step, no backend.

## 2. Sweepstake rules

- **Teams:** 48 (2026 World Cup expanded format).
- **Participants:** 6 fixed friends.
- **Allocation:** Random draw — each person owns exactly 8 teams (48 / 6).
- **Winning rule:** The owner of the tournament champion wins the sweepstake. Single winner, no points.
- (Tracking still shows alive/eliminated, recent results, etc. for engagement — but the win condition is just "whose team lifts the trophy".)

## 3. Scope (v1, ships pre-kickoff)

Two routes, single repo:

| Route | Purpose |
|---|---|
| `/draw.html` (or `/draw/`) | One-time live animated draw. Renders a "sticker pot," reveals each owner's 8 teams, and exports the result as a JSON file the user commits to the repo. |
| `/` (`index.html`) | Tournament dashboard. Renders from committed data + best-effort live overlay. |

**Explicitly out of scope for v1 (planned post-kickoff additions):**
- Full match schedule view (calendar of all 104 matches).
- Knockout bracket visualization (added ~2026-06-30 when R32 begins).
- Per-owner detail page.
- Authentication, comments, predictions, leaderboard scoring.

These are all additive — same data model, separate routes — and explicitly designed to slot in without refactoring.

## 4. Visual style

**Panini sticker album.** Cream background (`#fff7e8`), Georgia italic headlines in maroon (`#8b1a1a`), team chips rendered as small (~34×44px) sticker cards with a flag emoji on top, 3-letter code below, hard black border, yellow-orange gradient fill, offset drop-shadow for "stuck on" feel. Eliminated teams desaturate and get a red **OUT** stamp angled across them.

**Timezone toggle.** Lives in a small right-aligned header strip *above* the cover (its own row, not overlapping the title block). A tiny "TIMEZONE" uppercase label sits over two ~32px sticker-style flag tiles: 🇬🇧 UK (default) and 🇨🇾 CY. Both flags stay fully visible at all times — the active state is shown by gold fill + "pressed in" shadow, not by fading the inactive option. Clicking either re-renders all times across the page (kickoff times in Latest Results, Up Next, matchday date in the cover). Selection persists in `localStorage` under `sweep26.tz` so it survives reloads. UK is BST (UTC+1) during the tournament window; Cyprus is EEST (UTC+3) — a 2-hour gap.

Sections, top to bottom on `/`:

1. **Cover** — double-bordered title block "The 2026 Sweepstake — An Album of Glory" + a rotated stamp showing current matchday/date.
2. **Status strip** — three stats: teams still in (count), current leader (owner with most teams alive), matches today (count).
3. **The Album** — six owner cards (2-column grid) each showing the owner's name, alive count, and the 8 team stickers in a wrap row. Eliminated stickers desaturate.
4. **Latest Results** — match cards: home (flag + name + owner tag) · score column (score on top, italic timestamp `Yesterday · 20:00` below) · away.
5. **Up Next** — same card layout, but the score column shows kickoff time only.
6. **Footer** — last-refresh timestamp, link to `/draw`, placeholder note for upcoming bracket page.

Mockups were validated in the brainstorm browser at `dashboard-layout-v4.html`. CSS will live in `css/styles.css`.

## 5. Tech stack

- **Vanilla HTML/CSS/JS, no build step.** ES modules served directly by GitHub Pages.
- Hosting: GitHub Pages from the repo root (or `/docs`).
- No frameworks, no bundler, no TypeScript. Adding any of those later is trivial if needed.
- Flags rendered as Unicode flag emojis (no image assets needed for v1).
- Data lives in committed JSON files; daily refresh via GitHub Actions.

## 6. Data model

All data is JSON, committed to the repo, fetched at runtime via `fetch()`.

### `data/teams.json` — static, hand-authored once

```json
[
  { "code": "BRA", "name": "Brazil", "flag": "🇧🇷", "group": "A" },
  { "code": "ESP", "name": "Spain", "flag": "🇪🇸", "group": "B" },
  ...
]
```

Length: 48. Codes are 3-letter FIFA codes; primary key throughout.

### `data/owners.json` — written by the draw, then committed

```json
{
  "drawCompletedAt": "2026-06-10T19:30:00Z",
  "owners": [
    { "name": "Marco", "teams": ["BRA", "ESP", "ARG", "GER", "SEN", "JPN", "FRA", "PAR"] },
    { "name": "Sam",   "teams": ["POR", "NED", "ENG", "BEL", "CRO", "CRC", "MEX", "URU"] },
    { "name": "James", "teams": [...] },
    { "name": "Lucy",  "teams": [...] },
    { "name": "...",   "teams": [...] },
    { "name": "...",   "teams": [...] }
  ]
}
```

Before the draw: `drawCompletedAt` is `null` and each `teams` array is empty. The dashboard detects this state and shows an "Awaiting the draw — head to /draw" banner.

### `data/results.json` — refreshed daily by GitHub Action

```json
{
  "lastUpdated": "2026-06-14T14:32:00Z",
  "matches": [
    {
      "id": "m001",
      "kickoff": "2026-06-11T20:00:00Z",
      "stage": "group",
      "group": "A",
      "home": "MEX",
      "away": "...",
      "status": "finished",
      "homeScore": 2,
      "awayScore": 1
    },
    ...
  ]
}
```

`status` is `scheduled` | `live` | `finished`. The full 104-match list is committed initially with placeholder TBDs for knockouts; the Action overwrites kickoff/status/scores as data lands.

**Elimination is derived, not stored.** Client-side logic computes "is team X still in?" from `results.json`:
- Group stage: standings ranking (points → GD → GF → H2H). Teams finishing in qualifying positions stay alive; others eliminated.
- Knockouts: a team is eliminated the moment they lose a knockout match (`status === "finished"` with their score lower).

This avoids a second source of truth and keeps the data layer thin.

## 7. Draw flow

`/draw.html` is opened once on draw day, with friends present (or screen-sharing).

1. Page loads with 6 name inputs (pre-filled with current owner names if `owners.json` already has them — friendly for re-runs during testing; the user can edit).
2. "Begin the Draw" button. On click:
   - All 48 team stickers render in a "sticker pot" grid, face-up.
   - For each owner in turn: 8 teams are randomly pulled from the remaining pool, animated flying into that owner's card. Sound effects optional.
   - Randomness uses `crypto.getRandomValues()` for fair shuffling (Fisher–Yates).
3. When all 6 × 8 = 48 picks are placed:
   - Result is shown as a final summary.
   - "Download owners.json" button produces the file ready to commit.
   - "Copy share link" encodes the result into the URL hash so a reload preserves it (useful if someone refreshes mid-draw or wants to share immediately before committing).
4. User commits the file to `data/owners.json` and pushes. Dashboard now shows the allocation.

**Why both download and URL-hash?** The download is the canonical persist path (commit to repo). The URL hash is a fallback so refreshing the page right after the draw doesn't lose the result.

## 8. Tracking flow

When `/` loads:

1. **Render immediately from committed data.**
   - `fetch('data/teams.json')`, `fetch('data/owners.json')`, `fetch('data/results.json')` in parallel.
   - Compute derived state (which teams are alive, current leader, today's matches).
   - Paint the dashboard.

2. **Best-effort live overlay (in parallel, non-blocking).**
   - Fire a request to a public football-results API for matches in flight today.
   - If it returns within ~3s: merge live scores into already-rendered match cards, add a small "● LIVE" badge.
   - If it fails (rate limit, CORS, timeout, network): silently ignore. The page is already useful from the committed data.
   - Live data never persists. The next dashboard load is back to the committed `results.json` until the daily Action picks up the fresh data.

3. **Refresh button + auto-refresh** (cheap addition): manual button in the footer that re-runs the live overlay. No polling for v1.

## 9. Daily refresh (GitHub Action)

`.github/workflows/fetch-results.yml`:

- **Schedule:** every 6 hours (`cron: '0 */6 * * *'`).
- **Steps:**
  1. Checkout repo.
  2. Run `scripts/fetch-results.mjs` (Node 20, no dependencies beyond `node:https` / `fetch`).
  3. Script calls the provider API, transforms the response to our `data/results.json` schema, writes it to disk.
  4. If `git diff` shows changes, commit with `[skip ci]` and push back to `main`.
- **Secrets:** API key (if needed) stored as `FOOTBALL_API_KEY` repo secret.

**API provider:** chosen during implementation. Candidates: football-data.org (generous free tier, World Cup historically included), api-football.com via RapidAPI (more flexible, requires key). The transform layer in `scripts/fetch-results.mjs` is the only place that knows the provider's response shape — swappable in isolation if a provider goes down.

If the API call fails inside the Action, the workflow exits non-zero, no commit is made, and the previous `results.json` stays in place. The dashboard continues working with the last successful snapshot.

## 10. File layout

```
/
├── index.html                 # Dashboard
├── draw.html                  # Live animated draw
├── README.md
├── css/
│   └── styles.css             # Panini theme + components
├── js/
│   ├── app.js                 # Dashboard bootstrap, calls renderers
│   ├── draw.js                # Draw animation + export
│   ├── data.js                # Load JSON, fire live overlay, fallback handling
│   ├── standings.js           # Group standings + alive/eliminated derivation
│   ├── tz.js                  # Timezone toggle + Intl.DateTimeFormat helpers
│   └── render/
│       ├── cover.js
│       ├── status.js
│       ├── album.js
│       ├── results.js
│       └── upcoming.js
├── data/
│   ├── teams.json             # 48 teams, hand-authored
│   ├── owners.json            # 6 owners, written by draw
│   └── results.json           # 104 matches, refreshed by Action
├── scripts/
│   └── fetch-results.mjs      # Run by Action; updates results.json
└── .github/
    └── workflows/
        └── fetch-results.yml  # Daily schedule
```

Modules are small (~50–150 LoC each), single-purpose, and importable directly as ES modules. No bundling step.

## 11. Extension hooks (post-kickoff additions)

| Extension | Where it slots in |
|---|---|
| `/bracket.html` (R16 onwards) | New file, reuses `data/results.json` + a new `js/render/bracket.js`. Linked from the footer. |
| `/schedule.html` (full match calendar) | New file, reads same `results.json`, groups by date. |
| Per-owner page (`/o/:name`) | Can be a single `owner.html` reading `?name=` query param. |
| Predictions / side bets | New `data/predictions.json`; new render module; new section on dashboard. |
| Swap API provider | Only `scripts/fetch-results.mjs` changes. Schema stays. |
| Theme change | All CSS in `css/styles.css` keyed off CSS custom properties at `:root`. |

No v1 code locks any of these out.

## 12. Error and empty states

- **Pre-draw:** `owners.json` exists but `drawCompletedAt: null`. Dashboard shows a centred "The draw hasn't happened yet — head to /draw" card instead of the album.
- **Pre-kickoff:** No finished matches. Status strip shows "Tournament begins in N days." Latest Results section hidden (or shows "No results yet — kickoff 11 June").
- **Missing data file:** Inline error in the relevant section ("Couldn't load results — try refreshing"). Other sections still render.
- **Live overlay failure:** Silent. No UI change. Committed data is the floor.
- **Mid-knockout, missing bracket page:** Dashboard's "Up Next" and "Latest Results" continue working off `results.json` regardless of whether the bracket page has been built yet.

## 13. Testing approach

Limited automated testing for v1 given the timeline; rely on:

1. **Manual:** Load `draw.html` with a stubbed dataset, run the draw multiple times, verify 48 teams distributed without repeats and each owner gets 8.
2. **Manual:** Load `index.html` with a hand-crafted `results.json` containing a mix of finished/live/scheduled matches; verify elimination logic, owner alive counts, leader calc.
3. **Action dry-run:** `workflow_dispatch` trigger on the GitHub Action so it can be run on demand and inspected before relying on cron.

A handful of pure-function unit tests for `standings.js` (compute group table from a list of matches) is worth ~30 minutes — it's the only non-trivial logic and easy to test in isolation. Run with `node --test`.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Picked API doesn't cover World Cup on free tier | Validate during implementation Day 1, before committing to provider. Have a second provider noted as fallback. |
| API token gets rate-limited or expires | Daily Action keeps the floor; live overlay is best-effort. Site never breaks. |
| Group standings tiebreakers are subtle | Lift the FIFA tiebreaker order from Wikipedia, implement in `standings.js`, unit test. |
| Time-zone confusion (matches kick off in US time zones, friends split UK / Cyprus) | Store all kickoffs as ISO UTC. Render via `Intl.DateTimeFormat` with explicit zone — `Europe/London` (default) or `Asia/Nicosia`, controlled by the top-right toggle and persisted in `localStorage` as `sweep26.tz`. Never use the browser's local TZ implicitly. |
| Knockout bracket needs to ship around 30 June | Treated as a planned v1.5. Reuses the same data layer; ~half-day of work. |
| One friend can't make draw day | Their name still goes in; we run the draw without them. The result is the result. |

## 15. Open decisions

- **API provider:** confirm on Day 1.
- **Repo name / Pages URL:** to be confirmed by user (e.g. `world-cup-2026`, `sweepstake`, or other). Default to `world_cup_sweepstake` matching local dir.
- **Owner names:** capture during draw (no need to pre-commit; the draw page asks).
- **Sound on the draw animation:** out of scope unless trivial; skip for v1.

---

End of design. Implementation plan to follow once approved.
