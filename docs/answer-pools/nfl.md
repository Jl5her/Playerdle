# NFL Answer Pool

## Goal

Favor players recognizable to both fantasy players and general NFL fans.

## Source Data

- Superset: `src/data/nfl/players.json`
- Tier source: FantasyPros NFL stats/rankings pages by position

## Generation Logic

1. Scrape FantasyPros positional lists configured in `src/data/nfl/fantasy-config.json`.
2. Normalize names and positions to match roster data.
3. Match each fantasy player to a player in the NFL superset.
4. Write matched superset IDs to `src/data/nfl/answer_pool.json`.

## Fanatic (Flex) Generation Logic

1. Scrape FantasyPros Half-PPR RB/WR/TE stat tables.
2. Derive Flex-only metrics (`FPPG`, `REC/G`, `YDS/G`, `TD/G`, `TGT/G`).
3. Match players to the NFL superset by normalized name + position + team.
4. Keep players with minimum game sample.
5. Curate answers by intersecting with classic NFL answer IDs, then backfill by highest `FPPG`.
6. Write players to `src/data/nfl/fanatic_players.json` and IDs to `src/data/nfl/fanatic_answer_pool.json`.

## Commands

- Generate NFL rosters: `pnpm run scrape:rosters -- --sport=nfl`
- Generate NFL answer pool: `pnpm run generate:answer-pool`
- Generate NFL Flex Fanatic data: `pnpm run scrape:nfl:fanatic`
- Do both: `pnpm run scrape:nfl`
