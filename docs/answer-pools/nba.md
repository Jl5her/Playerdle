# NBA Answer Pool

## Goal

Prioritize players who are highly draft-relevant and broadly recognizable.

## Source Data

- Superset: `src/data/nba/players.json`
- Tier source: FantasyPros NBA overall ranks

## Generation Logic

1. Load FantasyPros NBA overall ranks from embedded `ecrData`.
2. Build tiers:
   - Tier A: top 80
   - Tier B: 81-200
3. Match ranked players to the superset by normalized name + team abbreviation.
4. Write final ID subset to `src/data/nba/answer_pool.json`.

## Command

- `pnpm run generate:answer-pool:nba`
