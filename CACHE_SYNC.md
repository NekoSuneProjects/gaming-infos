# APINODE fallback-cache mirror

`@nekosuneprojects/gaming-infos` is API-first. Normal reads try the NekoSuneVR V5 API before using bundled JSON under `data/`.

The repository keeps **two independent last-good fallback snapshots** synchronized automatically:

- Gaming Infos: `GET /v5/games/api/gaming-infos`
- Game Codes: `GET /v5/games/api/codes`

## Schedule

The GitHub Action runs an **hourly APINODE change-watch at minute 23** and can also be started manually with `workflow_dispatch`.

The mirror still uses full content hashes, so an hourly check with no API data changes creates **no commit**. If APINODE adds, updates, repairs, or removes a game-info file or game-code record, the next successful hourly pass mirrors that change into this repository.

It also runs when the cache implementation itself changes so a newly deployed cache format can be populated immediately.

## Mirrored gaming-infos datasets

| Game | API type(s) |
|---|---|
| VRChat | `players`, `groups`, `worlds`, `avatars` |
| Genshin Impact | `characters` |
| Honkai: Star Rail | `characters` |
| Neverness to Everness | `characters` |
| Wuthering Waves | `characters` (Resonators) |
| Warframe | `characters` (Warframes) |
| Fortnite | `characters` (current/released Battle Royale characters) |
| Zenless Zone Zero | `characters` (Agents) |
| Tower of Fantasy | `characters` (Simulacra) |
| Arknights: Endfield | `characters` (Operators) |

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

The mirror does not call every `/:game/:code` endpoint. `GameCode(game, code)` can search the full cached per-game snapshot during an outage, which keeps the hourly request count low.

Game-code fallback layout:

```text
data/game-codes/
├── directory.json
├── status.json
├── .cache-manifest.json
└── games/
    ├── fortnite.json
    ├── warframe.json
    ├── genshin-impact.json
    └── ...
```

## Atomic synchronization / deletion behavior

Each cache is authoritative only **after its complete API download succeeds**.

For Gaming Infos:

1. Temporarily preserve `data/game-codes/` outside the gaming-info snapshot.
2. Fetch the root gaming-infos endpoint.
3. Fetch every configured game's meta endpoint.
4. Fetch every configured type-list endpoint.
5. Validate every response and entry slug.
6. Build a completely separate temporary snapshot.
7. Atomically replace the gaming-info `data/` snapshot.
8. Restore the previous game-code fallback before the code phase begins.

For Game Codes:

1. Fetch `/codes` and validate its game directory.
2. Fetch cache-only `/codes/status`.
3. Fetch every listed game's full `Active` / `Expired` / `Unknown` snapshot.
4. Build a separate temporary `data/game-codes/` tree.
5. Only after every game succeeds, atomically replace the old game-code snapshot.

Because successful API snapshots are authoritative, **adds, changes and removals are mirrored**. If APINODE removes an entry/code/game, the corresponding fallback disappears on the next successful hourly sync.

If APINODE is down, times out, returns 429/5xx, or one required endpoint fails halfway through, that cache is **not replaced**. The previous last-good fallback remains available.

## APINODE repair propagation

APINODE can repair bad/missing Gaming Infos images and remove invalid scraped Game Codes. Those repaired API records are treated like any other content change. The hourly mirror downloads the corrected records, updates the repository fallback, and removes stale fallback records that no longer exist upstream.

This gives the data path:

```text
APINODE source refresh / repair
        ↓
live V5 API changes
        ↓
hourly GitHub change-watch
        ↓
repository data/ fallback updates
```

## Package API

Gaming Infos functions remain available:

```js
const info = require('@nekosuneprojects/gaming-infos');

await info.Games();
await info.List('vrchat', 'avatars');
await info.Characters('wutheringwaves', 'cartethyia');
```

Game Codes helpers use live APINODE first and the hourly fallback second:

```js
await info.Codes();                    // GET /v5/games/api/codes
await info.CodesStatus();              // GET /v5/games/api/codes/status
await info.GameCodes('fortnite');      // Active + Expired
await info.GameCodes('fortnite', { includeUnknown: true });
await info.GameCode('fortnite', 'NEKOSUNEVR');
await info.CodeCacheInfo();
```

Per-game fallback filtering is supported for `category` and `claimType` as well.

## Commands

```bash
# Test both atomic cache systems
npm run test:all-cache

# Mirror both Gaming Infos and Game Codes
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

The package does **not** use the cache instead of live data. It remains API-first:

```text
application
   ↓
live APINODE
   ├─ success → current API response
   └─ unavailable/error → last-good bundled fallback
```

A successful changed Gaming Infos snapshot records `data/.cache-manifest.json`. Game Codes records its own `data/game-codes/.cache-manifest.json`. Both include source URL, content hash, counts, synchronization time and add/change/remove statistics.

The hash comparison ignores manifest timestamps, so an unchanged API dataset does not create a pointless hourly commit.

Note: npm releases are immutable. Repository fallback files update automatically, but an already-installed npm version keeps the bundled snapshot from that package release until upgraded. Live API reads still remain current whenever APINODE is available.
