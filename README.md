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

## Data refresh

Refreshed every 6 hours by `.github/workflows/fetch-results.yml`. Run it manually any time:

```
gh workflow run fetch-results.yml
```
