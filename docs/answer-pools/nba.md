# NBA Answer Pool

## Goal

Prioritize players who are highly draft-relevant and broadly recognizable.

## Source Data

- Superset: `src/data/nba/players.json`
- Tier source: FantasyPros NBA overall ranks
- Fanatic source: Basketball Reference NBA per-game table

## Generation Logic

1. Load FantasyPros NBA overall ranks from embedded `ecrData`.
2. Build tiers:
   - Tier A: top 80
   - Tier B: 81-200
3. Match ranked players to the superset by normalized name + team abbreviation.
4. Write final ID subset to `src/data/nba/answer_pool.json`.

## Fanatic Generation Logic

1. Scrape Basketball Reference season per-game data.
2. Normalize/match rows to `src/data/nba/players.json` by name and team.
3. Include Fanatic stat fields used by gameplay (`PTS`, `REB`, `AST`, `STL`, `3P%`) plus supplemental fields for future tuning.
4. Keep players with stable samples (minimum games + minutes per game).
5. Curate answer candidates by intersecting with the classic NBA answer pool (FantasyPros-recognizable names).
6. If the curated set is too small, backfill highest-scoring remaining players.
7. Write enriched players to `src/data/nba/fanatic_players.json`.
8. Write Fanatic answer IDs to `src/data/nba/fanatic_answer_pool.json`.

## Command

- `pnpm run generate:answer-pool:nba`
- `pnpm run scrape:nba:fanatic -- --season=2026`
