# World Cup 2026 Sweepstake

Live: <https://marcoedelgado.github.io/world-cup-sweepstake/>

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
node --test tests/*.mjs
```

## Previewing future tournament states

`scripts/simulate-tournament.mjs` overwrites `data/results.json` with a deterministic, seed-based state — useful for testing how the dashboard, bracket, and Heat Check transitions look before real fixtures land.

```
node scripts/simulate-tournament.mjs                     # group-mid: matchdays 1+2 finished + 1 live + 23 scheduled
node scripts/simulate-tournament.mjs --phase=group-full  # all 72 finished → triggers knockout phase
node scripts/simulate-tournament.mjs --seed=99           # different scoreline distribution
```

Revert with: `git checkout data/results.json`.

## Data refresh

Refreshed every 6 hours by `.github/workflows/fetch-results.yml`. Run it manually any time:

```
gh workflow run fetch-results.yml
```
