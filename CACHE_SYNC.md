# APINODE fallback-cache mirror

`@nekosuneprojects/gaming-infos` is API-first. Normal reads try the NekoSuneVR V5 API before using bundled JSON under `data/`.

The repository keeps **two independent last-good fallback snapshots** synchronized automatically:

- Gaming Infos: `GET /v5/games/api/gaming-infos`
- Game Codes: `GET /v5/games/api/codes`

## Schedule

The GitHub Action runs an **hourly APINODE change-watch at minute 23** and can also be started manually with `workflow_dispatch`.

The mirror uses full content hashes, so an hourly check with no stable API data changes creates **no commit**. If APINODE adds, updates, repairs, moves, or removes a game-info file or game-code record, the next successful hourly pass mirrors that change into this repository.

## Gaming Infos dataset discovery

Gaming Infos cache schema 2 no longer depends only on a hard-coded game manifest.

The mirror first requests:

```http
GET /v5/games/api/gaming-infos
```

Modern APINODE responses expose each game's stable `slug` and dataset `types`, for example:

```json
{
  "slug": "codblackops2",
  "types": ["characters", "npcs", "maps"]
}
```

The mirror merges those declarations into its safety/baseline manifest and then fetches every discovered game/type. This means the full Call of Duty catalog, and future public Gaming Infos games/types, can propagate into the repository without adding one hard-coded mirror entry per title.

The built-in baseline remains for compatibility with older APINODE deployments and can still be replaced explicitly with `GAMING_INFOS_CACHE_MANIFEST_JSON`.

Current important datasets include:

| Game / family | API type(s) |
|---|---|
| VRChat | `players`, `groups`, `worlds`, `avatars` |
| Genshin Impact | `characters` |
| Honkai: Star Rail | `characters` |
| Neverness to Everness | `characters` |
| Wuthering Waves | `characters` (Resonators) |
| Warframe | `characters` (Warframes) |
| Fortnite | `characters` = released Outfits/skins, `npcs` = Battle Royale NPCs, `maps` = Named Locations/maps |
| Call of Duty mainline | `characters`, `npcs`, `maps` per title, auto-discovered from APINODE |
| Zenless Zone Zero | `characters` (Agents) |
| Tower of Fantasy | `characters` (Simulacra) |
| Arknights: Endfield | `characters` (Operators) |

Call of Duty covers mainline slugs from `cod2003` through `codblackops7`, plus `codmodernwarfare4`. The 2026 MW4 dataset is restricted upstream to official Activision beta/public announcement information; the fallback never expands that policy by scraping separate unofficial data.

## Mirrored Game Codes endpoints

The hourly mirror also caches:

```text
GET /v5/games/api/codes
GET /v5/games/api/codes/status
GET /v5/games/api/codes/:game?includeUnknown=true
```

`/codes/status` only reads APINODE's cached source state. It does **not** trigger source website refreshes.

The per-game request uses `includeUnknown=true`, so the fallback contains all three buckets when available:

```json
{
  "Active": [],
  "Expired": [],
  "Unknown": []
}
```

The repository does not store ticking `expiresInSeconds` / `countdown` values as authoritative file changes. Those values are rehydrated from stable `expiresAt` dates when the package reads a local fallback, preventing pointless hourly commits.

## Atomic synchronization / deletion behavior

Each cache is authoritative only **after its complete API download succeeds**.

For Gaming Infos:

1. Temporarily preserve `data/game-codes/` outside the Gaming Infos snapshot.
2. Fetch the root Gaming Infos endpoint.
3. Merge valid root `slug` + `types` declarations into the effective manifest.
4. Fetch every effective game's meta endpoint.
5. Fetch every discovered/configured type-list endpoint.
6. Validate every response and entity slug.
7. Build a completely separate temporary snapshot.
8. Atomically replace the Gaming Infos `data/` snapshot only after every required request succeeds.
9. Restore the previous Game Codes fallback before the code phase begins.

For Game Codes:

1. Fetch `/codes` and validate its game directory.
2. Fetch cache-only `/codes/status`.
3. Fetch every listed game's full `Active` / `Expired` / `Unknown` snapshot.
4. Normalize volatile request-time/countdown values.
5. Build a separate temporary `data/game-codes/` tree.
6. Only after every game succeeds, atomically replace the old Game Codes snapshot.

Because successful API snapshots are authoritative, **adds, changes and removals are mirrored**. If APINODE moves an old Fortnite record between datasets, or removes/changes a Call of Duty entity, the next fully successful mirror reproduces that structure in the fallback.

If APINODE is down, times out, returns 429/5xx, or one required endpoint fails halfway through, that cache is **not replaced**. The previous last-good fallback remains available.

## APINODE synchronization / repair propagation

APINODE performs content synchronization and data-quality repair before this repository consumes the public API. That includes bad Game Code cleanup, image repair, Fortnite dataset separation, and the database-backed Call of Duty public-data sync.

```text
APINODE source refresh / repair
        ↓
Gaming Infos + Game Codes API
        ↓
hourly GitHub change-watch
        ↓
repository data/ fallback
```

## Package API

```js
const info = require('@nekosuneprojects/gaming-infos');

// Fortnite
await info.List('fortnite', 'characters');
await info.List('fortnite', 'npcs');
await info.List('fortnite', 'maps');

// Call of Duty
await info.List('codblackops2', 'characters');
await info.List('codblackops2', 'npcs');
await info.List('codblackops2', 'maps');
await info.List('codmodernwarfare4', 'maps');

await info.Characters('codblackops2', 'character-slug');
await info.NPCs('codblackops2', 'npc-slug');
await info.Maps('codblackops2', 'map-slug');

// Other Gaming Infos
await info.List('vrchat', 'avatars');
await info.Characters('wutheringwaves', 'cartethyia');

// Game Codes
await info.Codes();
await info.CodesStatus();
await info.GameCodes('fortnite', { includeUnknown: true });
await info.GameCode('fortnite', 'NEKOSUNEVR');
```

## Commands

```bash
npm run test:all-cache
npm run sync:cache

# Debug individually
npm run sync:gaming-infos-cache
npm run sync:game-codes-cache
npm run test:cache-sync
npm run test:game-code-cache
```

Override APINODE while testing:

```bash
GAMING_INFOS_API_BASE=http://localhost:3000 npm run sync:cache
```

Useful variables:

| Variable | Default | Purpose |
|---|---|---|
| `GAMING_INFOS_API_BASE` | `https://api.nekosunevr.co.uk` | APINODE host used by both caches |
| `GAMING_INFOS_API_PATH` | `/v5/games/api/gaming-infos` | Gaming Infos path |
| `GAME_CODES_API_PATH` | `/v5/games/api/codes` | Game Codes path |
| `GAMING_INFOS_CACHE_MANIFEST_JSON` | baseline + root discovery | Optional explicit baseline manifest |
| `GAMING_INFOS_CACHE_TIMEOUT_MS` | `15000` | Gaming Infos per-request timeout |
| `GAMING_INFOS_CACHE_RETRIES` | `2` | Gaming Infos retry count |
| `GAME_CODES_CACHE_TIMEOUT_MS` | `15000` | Game Codes sync request timeout |
| `GAME_CODES_CACHE_RETRIES` | `2` | Game Codes retry count |
| `GAME_CODES_CACHE_GAME_DELAY_MS` | `150` | Small delay between game-list requests |

## Runtime fallback behavior

The package remains API-first:

```text
application
   ↓
live APINODE
   ├─ success → current API response
   └─ unavailable/error → last-good bundled fallback
```

A successful changed Gaming Infos snapshot records `data/.cache-manifest.json` with schema version 2, its effective game/type manifest, content hash, counts and add/change/remove statistics. Game Codes records `data/game-codes/.cache-manifest.json` separately. The hash comparison ignores manifest timestamps and other explicitly volatile values.

Note: npm releases are immutable. Repository fallback files update automatically, but an already-installed npm version keeps the snapshot bundled with that release until upgraded. Live API reads still remain current whenever APINODE is available.
