# Answer Pool Generation

This directory documents how each league's `answer_pool.json` is generated.

Data layout by sport:

- `src/data/<sport>/players.json`: full guessable player superset
- `src/data/<sport>/teams.json`: team metadata used by the game
- `src/data/<sport>/answer_pool.json`: answer IDs (must be a subset of `players.json` IDs)

League writeups:

 - `docs/answer-pools/nfl.md`
 - `docs/answer-pools/mlb.md`
 - `docs/answer-pools/nba.md`
 - `docs/answer-pools/nhl.md`
