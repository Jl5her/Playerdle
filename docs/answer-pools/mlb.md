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

## Command

- `pnpm run generate:answer-pool:mlb`
