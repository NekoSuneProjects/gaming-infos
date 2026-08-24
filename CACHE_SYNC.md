# APINODE fallback-cache mirror

`@nekosuneprojects/gaming-infos` is API-first. Normal reads try the NekoSuneVR V5 API before using bundled JSON under `data/`.

The repository keeps **two independent last-good fallback snapshots** synchronized automatically:

- Gaming Infos: `GET /v5/games/api/gaming-infos`
- Game Codes: `GET /v5/games/api/codes`

## Schedule

The GitHub Action runs an **hourly APINODE change-watch at minute 23** and can also be started manually with `workflow_dispatch`.

The mirror uses full content hashes, so an hourly check with no API data changes creates **no commit**. If APINODE adds, updates, repairs, moves, or removes a game-info file or game-code record, the next successful hourly pass mirrors that change into this repository.

## Mirrored Gaming Infos datasets

| Game | API type(s) |
|---|---|
| VRChat | `players`, `groups`, `worlds`, `avatars` |
| Genshin Impact | `characters` |
| Honkai: Star Rail | `characters` |
| Neverness to Everness | `characters` |
| Wuthering Waves | `characters` (Resonators) |
| Warframe | `characters` (Warframes) |
| Fortnite | `characters` = released Outfits/skins, `npcs` = Battle Royale NPCs, `maps` = Named Locations/maps |
| Zenless Zone Zero | `characters` (Agents) |
| Tower of Fantasy | `characters` (Simulacra) |
| Arknights: Endfield | `characters` (Operators) |

Fortnite is intentionally split. A location such as Wonkeeland must never be mirrored as a `characters` entry, and NPC records are kept separate from released cosmetic Outfits.

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
3. Fetch every configured game's meta endpoint.
4. Fetch every configured type-list endpoint, including all three Fortnite datasets.
5. Validate every response and entry slug.
6. Build a completely separate temporary snapshot.
7. Atomically replace the Gaming Infos `data/` snapshot.
8. Restore the previous Game Codes fallback before the code phase begins.

For Game Codes:

1. Fetch `/codes` and validate its game directory.
2. Fetch cache-only `/codes/status`.
3. Fetch every listed game's full `Active` / `Expired` / `Unknown` snapshot.
4. Normalize volatile request-time/countdown values.
5. Build a separate temporary `data/game-codes/` tree.
6. Only after every game succeeds, atomically replace the old Game Codes snapshot.

Because successful API snapshots are authoritative, **adds, changes and removals are mirrored**. If APINODE moves an old Fortnite record from `characters` to `npcs` or `maps`, the next successful mirror removes it from `characters` and creates it in the correct fallback directory.

If APINODE is down, times out, returns 429/5xx, or one required endpoint fails halfway through, that cache is **not replaced**. The previous last-good fallback remains available.

## APINODE repair propagation

APINODE performs content synchronization and data-quality repair before this repository consumes the public API. That includes bad Game Code cleanup, image repair, and Fortnite dataset separation.

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
await info.List('fortnite', 'characters'); // released skins / Outfits
await info.List('fortnite', 'npcs');       // Battle Royale NPCs
await info.List('fortnite', 'maps');       // maps / Named Locations

await info.Characters('fortnite', 'outfit-slug');
await info.NPCs('fortnite', 'npc-slug');
await info.Maps('fortnite', 'map-slug');

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

A successful changed Gaming Infos snapshot records `data/.cache-manifest.json`. Game Codes records `data/game-codes/.cache-manifest.json`. The hash comparison ignores manifest timestamps and other explicitly volatile values.

Note: npm releases are immutable. Repository fallback files update automatically, but an already-installed npm version keeps the snapshot bundled with that release until upgraded. Live API reads still remain current whenever APINODE is available.
