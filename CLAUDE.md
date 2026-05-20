# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Start dev server (React app at localhost:5173)
pnpm dev

# Build (runs sport validation first, then Turbo build)
pnpm build

# Lint
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Format
pnpm format

# Run sport config validation only
pnpm validate:sports
```

**Scraping & data generation** (run when updating player rosters or stats):
```bash
# Update all sports (scrape rosters + generate answer pools + scrape fanatic stats)
pnpm scrape

# Update a single sport
pnpm scrape:nfl   # or scrape:nba / scrape:mlb / scrape:nhl

# Sync Journeyman player data from playerdle roster data
pnpm sync:journey
```

There are no test files in this repository. The primary correctness check is `pnpm validate:sports`, which runs automatically before every build.

## Architecture

**Monorepo layout** managed by pnpm workspaces + Turborepo:
- `apps/react/` — the main Vite/React PWA (the only deployed frontend)
- `apps/expo/` — a React Native/Expo app (minimal, not the primary app)
- `packages/data/` — all player/team/answer pool JSON data and Journeyman data utilities
- `packages/types/` — shared TypeScript types (`GameMode`, `GameResult`, `Stats`)
- `packages/theme/` — shared CSS theme variables
- `functions/` — Cloudflare Pages Functions (edge API for device sync)
- `scripts/` — data maintenance scripts (scraping, answer pool generation)

**Three games** live in `apps/react/src/games/`:
1. **Playerdle** (`playerdle/`) — guess the player across NFL/MLB/NBA/NHL in 6 tries using columnar clues
2. **Journeyman** (`journeyman/`) — guess the career path of a multi-team player in 5 tries
3. **Statehue** (`statehue/`) — guess the US state by its sports team colors

## Playerdle Game Data Flow

Each sport (nfl/mlb/nba/nhl) has three data files under `packages/data/src/playerdle/<sport>/`:
- `players.json` — full guessable player superset
- `teams.json` — team metadata including brand colors
- `answer_pool.json` — IDs of players eligible to be daily answers (subset of `players.json`)
- `fanatic_players.json` / `fanatic_answer_pool.json` — stats-based variant data

The sport config is assembled in `apps/react/src/games/playerdle/sports/<sport>.tsx` by importing these JSON files and defining `SportColumn` entries with evaluator rules. `loadSportConfig()` in `sports/registry.tsx` lazy-loads sport modules so player data is code-split per sport.

**`SportConfig`** (defined in `sports/types.ts`) is the central contract: it contains `players`, `answerPool`, `columns`, and optional `variants`. `resolveSportConfig()` in `sports/variants.ts` merges a `SportVariant` (e.g. "fanatic") onto the base config, overriding players/answerPool/columns.

**Daily answer selection** uses `minHashPick()` in `shared/utils/daily-select.ts`: every item is hashed with `seed + id`, and the minimum hash wins. This is order-independent — reordering the pool never shifts past dates.

**Column evaluation** in `sports/evaluation.ts` supports three evaluator types defined on each `SportColumn`:
- `match` — exact equality → correct/incorrect
- `mismatch` — inequality → correct/incorrect
- `comparison` — numeric with `closeWithin` threshold and optional directional arrow

## Routing

`App.tsx` is the router. NFL is the default sport with no URL prefix (routes at `/`, `/daily`, `/arcade`). Other sports use `/:sport/` prefix (e.g. `/mlb/daily`). The "fanatic" variant adds a `/fanatic` path segment. `AppShell` manages the sport-level state and lazy-loads the sport config on mount.

`usePanelStack` (`shared/hooks/use-panel-stack.ts`) is the primitive for overlays: it maintains a string stack of open panel IDs. Panels (guide, stats, calendar) slide over the game using CSS crossfade transitions.

## Persistence

All game state lives in `localStorage`:
- `playerdle-state:<sportId>:<variantId>:<dateKey>` — in-progress guess IDs for the daily
- `playerdle-stats:<sportId>:<variantId>` — JSON array of `GameResult` objects
- `playerdle-journey-played-day:<league>` / `playerdle-journey-history:v1:<league>` — Journeyman equivalents
- Archive plays (replayed after the date) are flagged `archive: true` and excluded from streak math

**Device sync** (`shared/utils/sync.ts`) hashes a 5-word passphrase via SHA-256 and uses that as the key for the Cloudflare KV edge API at `/api/sync/:hash`. The KV namespace is `PLAYERDLE_SYNC_KV` (configured in `wrangler.toml`). All `playerdle-stats:*`, `playerdle-state:*`, `playerdle-tutorial-seen-v2:*`, and journey keys are included in the sync payload.

## Team Color Convention

Each team in `packages/data/src/playerdle/<sport>/teams.json` has a `colors` array of up to 3 entries used by Journeyman (3-diamond palette) and Playerdle confetti.

**Ordering:** `[primary, secondary, tertiary]` — most prominent brand color first.

**Third slot rules:**
- Use a real hex color only if the team genuinely has a 3rd distinct brand color (appears on uniforms, not just a minor logo accent).
- Use `"transparent"` when the team only has 2 primary brand colors. White-as-jersey-background does not count as a brand color.

**NBA reference** (established precedent):

| Team | Primary | Secondary | Tertiary |
|---|---|---|---|
| Atlanta Hawks | Red `#e03a3e` | Volt `#c1d32f` | Near Black `#26282a` |
| Boston Celtics | Green `#007a33` | White `#ffffff` | transparent |
| Brooklyn Nets | Black `#000000` | White `#ffffff` | transparent |
| Charlotte Hornets | Purple `#1d1160` | Teal `#00788c` | Gray `#a1a1a4` |
| Chicago Bulls | Red `#ce1141` | Black `#000000` | transparent |
| Cleveland Cavaliers | Wine `#860038` | Gold `#fdbb30` | Navy `#041e42` |
| Dallas Mavericks | Blue `#00538c` | Navy `#002b5e` | Silver `#b8c4ca` |
| Denver Nuggets | Navy `#0e2240` | Gold `#fec524` | Rust `#8b2131` |
| Detroit Pistons | Red `#c8102e` | Blue `#1d42ba` | transparent |
| Golden State Warriors | Blue `#1d428a` | Gold `#ffc72c` | transparent |
| Houston Rockets | Red `#ce1141` | Black `#000000` | Silver `#c4ced4` |
| Indiana Pacers | Navy `#0c2340` | Gold `#ffd520` | Silver `#bec0c2` |
| LA Clippers | Red `#c8102e` | Blue `#1d428a` | transparent |
| Los Angeles Lakers | Purple `#552583` | Gold `#fdb927` | transparent |
| Memphis Grizzlies | Navy `#12173f` | Blue `#5d76a9` | Gold `#f5b112` |
| Miami Heat | Red `#98002e` | Black `#000000` | Gold `#f9a01b` |
| Milwaukee Bucks | Green `#00471b` | Cream `#eee1c6` | Black `#000000` |
| Minnesota Timberwolves | Navy `#0c2340` | Blue `#236192` | Gray `#9ea2a2` |
| New Orleans Pelicans | Navy `#0a2240` | Gold `#b4975a` | Red `#c8102e` |
| New York Knicks | Blue `#006bb6` | Orange `#f58426` | Silver `#bec0c2` |
| Oklahoma City Thunder | Blue `#007ac1` | Orange `#ef3b24` | Navy `#002d62` |
| Orlando Magic | Blue `#0077c0` | Black `#000000` | Silver `#c4ced4` |
| Philadelphia 76ers | Blue `#006bb6` | Red `#ed174c` | Navy `#002b5c` |
| Phoenix Suns | Purple `#1d1160` | Orange `#e56020` | Gold `#f9ad1b` |
| Portland Trail Blazers | Red `#e03a3e` | Black `#000000` | transparent |
| Sacramento Kings | Purple `#5a2d81` | Black `#000000` | Gray `#63727a` |
| San Antonio Spurs | Black `#000000` | Silver `#c4ced4` | transparent |
| Toronto Raptors | Red `#d91244` | Black `#000000` | transparent |
| Utah Jazz | Purple `#4e008e` | Blue `#79a3dc` | Gold `#ffb81c` |
| Washington Wizards | Red `#e31837` | Navy `#002b5c` | Silver `#c4ced4` |

## Adding a New Sport or Variant

To add a new sport to Playerdle:
1. Add player/team/answer pool JSON to `packages/data/src/playerdle/<sport>/`
2. Create `apps/react/src/games/playerdle/sports/<sport>.ts` with columns and config
3. Add a `case` to `loadSportConfig()` in `sports/registry.tsx`
4. Add an entry to `SPORT_META` in `sports/registry.tsx`
5. Add the sport ID to `SportId` in `sports/types.ts`
6. Add the `SportId` to `validate-sports.ts`

To add a new variant (like "fanatic") to an existing sport, add a `variants` array entry in the sport config file — `resolveSportConfig()` handles the rest.

## Git Conventions

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

Common types:
- `feat`: new feature
- `fix`: bug fix
- `refactor`: code change that neither fixes a bug nor adds a feature
- `style`: formatting, whitespace, etc. (no logic change)
- `perf`: performance improvement
- `chore`: build process, dependency updates, tooling
- `docs`: documentation only

Examples:
```
feat(playerdle): add highlight to current daily result bar
fix(journeyman): prevent duplicate guesses from being submitted
refactor(stats): extract todayHighlightKey helper
chore(deps): update biome to v2
```

### Branch Naming
Use a `<type>/<short-description>` prefix matching the commit type:

- `feat/<description>` — new feature
- `fix/<description>` — bug fix
- `enhancement/<description>` — improvement to existing feature
- `refactor/<description>` — code restructuring
- `chore/<description>` — maintenance, deps, tooling
- `docs/<description>` — documentation

Examples: `feat/mlb-fanatic-variant`, `fix/streak-calculation`, `enhancement/stat-bar-highlight`

## Tooling

- **Formatter/Linter**: Biome (replaces ESLint + Prettier). Config in `biome.json`: 2-space indent, 100-char line width, double quotes, trailing commas, semicolons omitted where possible.
- **Build**: Vite with `@` aliased to `apps/react/src/`
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`)
- **Deployment**: Cloudflare Pages. Build output at `apps/react/dist`. Build command: `pnpm build`.
