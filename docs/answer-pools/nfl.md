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

## Commands

- Generate NFL rosters: `pnpm run scrape:rosters -- --sport=nfl`
- Generate NFL answer pool: `pnpm run generate:answer-pool`
- Do both: `pnpm run scrape:nfl`
