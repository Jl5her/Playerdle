# NHL Answer Pool

## Goal

Keep answers recognizable to fantasy players while preserving strong hockey identity
(top skaters plus enough known goalies).

## Source Data

- Superset: `src/data/nhl/players.json`
- Tier source: FantasyPros NHL overall ranks
- Recognition boost: NHL public leaders API (skater + goalie categories)

## Generation Logic

1. Load FantasyPros NHL overall ranks from embedded `ecrData`.
2. Build tiers:
   - Tier A: top 80
   - Tier B: 81-220
3. Match ranked players to the superset by normalized name + team abbreviation.
4. Add capped leader-based players (points, goals, assists, plus/minus, TOI, wins, save%, shutouts, GAA).
5. Enforce minimum goalie representation by backfilling highest-ranked fantasy goalies.
6. Write final ID subset to `src/data/nhl/answer_pool.json`.

## Fanatic (Skaters) Generation Logic

1. Scrape Hockey Reference season skater stats (`G`, `A`, `PTS`, `SOG`, `ATOI`).
2. Match rows to `src/data/nhl/players.json` by normalized name + team abbreviation.
3. Exclude goalies and small samples (minimum games and TOI/G).
4. Curate answers by intersecting with classic NHL answer IDs, then backfill by points.
5. Write players to `src/data/nhl/fanatic_players.json` and IDs to `src/data/nhl/fanatic_answer_pool.json`.

## Command

- `pnpm run generate:answer-pool:nhl`
- `pnpm run scrape:nhl:fanatic -- --season=2026`
