# MLB Answer Pool

## Goal

Blend casual recognizability (stars and stat leaders) with serious-fan relevance.

## Source Data

- Superset: `src/data/mlb/players.json`
- Tier source: FantasyPros MLB overall ranks
- Recognition boost: MLB Statcast/Stats API leaderboards

## Generation Logic

1. Load FantasyPros overall MLB ranks from embedded `ecrData`.
2. Build tiers:
   - Tier A: top 150
   - Tier B (top half): 151-250
3. Match ranked players to the superset by normalized name + team abbreviation.
4. Add a capped set of leaderboard standouts (HR, RBI, AVG, OPS, ERA, K, SV, W) not already in tiers.
5. Write final ID subset to `src/data/mlb/answer_pool.json`.

## Fanatic (Hitters) Generation Logic

1. Scrape Baseball Reference season batting stats (`AVG`, `HR`, `RBI`, `SB`, `OPS`).
2. Match rows to `src/data/mlb/players.json` by normalized name + team abbreviation.
3. Keep hitters only (exclude pitchers) and remove small samples (minimum games and PA).
4. Curate answers by intersecting with classic MLB answer IDs, then backfill by OPS.
5. Write players to `src/data/mlb/fanatic_players.json` and IDs to `src/data/mlb/fanatic_answer_pool.json`.

## Command

- `pnpm run generate:answer-pool:mlb`
- `pnpm run scrape:mlb:fanatic -- --season=2025`
