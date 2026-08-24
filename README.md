# 🌐 @nekosuneprojects/gaming-infos

[![npm version](https://img.shields.io/npm/v/@nekosuneprojects/gaming-infos.svg)](https://www.npmjs.com/package/@nekosuneprojects/gaming-infos)

A Node.js data package for **multi-game information, Fortnite skins/NPCs/maps, VRChat community data, characters, redeem codes, and creator codes**.

The package is **API-first**: it reads from the NekoSuneVR V5 API whenever possible, then automatically falls back to bundled JSON when the API is unavailable. The fallback repository checks APINODE every hour and only commits real add/change/remove data updates.

Current package version: **2.3.0**

## Installation

```bash
npm install @nekosuneprojects/gaming-infos
```

Requires Node.js 18+.

## Gaming Infos coverage

| Game | Slug | Datasets |
|---|---|---|
| VRChat | `vrchat` | `players`, `groups`, `worlds`, `avatars` |
| Genshin Impact | `genshinimpact` | `characters` |
| Honkai: Star Rail | `honkaistarrail` | `characters` |
| Neverness to Everness | `nte` | `characters` |
| Wuthering Waves | `wutheringwaves` | `characters` (Resonators) |
| Warframe | `warframe` | `characters` (Warframes) |
| **Fortnite** | `fortnite` | `characters` = released skins/Outfits, `npcs` = Battle Royale NPCs, `maps` = Named Locations/maps |
| Zenless Zone Zero | `zenlesszonezero` | `characters` (Agents) |
| Tower of Fantasy | `toweroffantasy` | `characters` (Simulacra) |
| Arknights: Endfield | `arknightsendfield` | `characters` (Operators) |

### Fortnite dataset rules

Fortnite is deliberately separated into three API/package datasets:

```text
fortnite/characters  → released Outfit cosmetics / skins
fortnite/npcs        → Battle Royale NPCs / Characters
fortnite/maps        → Named Locations / map locations
```

A map/location should never appear in the skins dataset. APINODE also removes legacy NPC duplicates when a title is confirmed by the Fortnite Named Locations catalog.

## Quick start

```js
const info = require('@nekosuneprojects/gaming-infos');

async function main() {
  const games = await info.Games();

  const fortniteSkins = await info.List('fortnite', 'characters');
  const fortniteNpcs = await info.List('fortnite', 'npcs');
  const fortniteMaps = await info.List('fortnite', 'maps');

  const vrchatWorlds = await info.List('vrchat', 'worlds');
  const wuwa = await info.List('wutheringwaves', 'characters');

  console.log({
    games: games.length,
    fortniteSkins: fortniteSkins.length,
    fortniteNpcs: fortniteNpcs.length,
    fortniteMaps: fortniteMaps.length,
    vrchatWorlds: vrchatWorlds.length,
    wuwa: wuwa.length,
  });
}

main();
```

## Gaming Infos API

Live APINODE endpoints:

```http
GET /v5/games/api/gaming-infos
GET /v5/games/api/gaming-infos/:game/:type
GET /v5/games/api/gaming-infos/:game/:type/:name
```

The list endpoint returns stable `slug` values for detail lookups.

### Main helpers

```js
await info.Games();
await info.Game('fortnite');
await info.List('fortnite', 'characters');
await info.List('fortnite', 'npcs');
await info.List('fortnite', 'maps');

await info.Characters('fortnite', 'outfit-slug');
await info.NPCs('fortnite', 'npc-slug');
await info.Maps('fortnite', 'map-slug');

await info.Worlds('vrchat', 'world-slug');
await info.Groups('vrchat', 'group-slug');
await info.Players('vrchat', 'player-slug');
await info.Avatars('vrchat', 'avatar-slug');

await info.Get('fortnite', 'maps', 'map-slug');
await info.CacheInfo();
```

## Game Codes API

Game Codes are separate from Gaming Infos and are discovered dynamically from APINODE.

```http
GET /v5/games/api/codes
GET /v5/games/api/codes/status
GET /v5/games/api/codes/:game
GET /v5/games/api/codes/:game/:code
```

Package helpers:

```js
const directory = await info.Codes();
const status = await info.CodesStatus();

const codes = await info.GameCodes('fortnite');
const allCodes = await info.GameCodes('fortnite', { includeUnknown: true });
const oneCode = await info.GameCode('fortnite', 'SOME-CODE');
const codeCache = await info.CodeCacheInfo();
```

Default per-game shape:

```json
{
  "Active": [],
  "Expired": []
}
```

With `includeUnknown: true`:

```json
{
  "Active": [],
  "Expired": [],
  "Unknown": []
}
```

`GameCodes()` also supports `category`, `claimType`, and `timezone` options.

## Function reference

| Function | Purpose |
|---|---|
| `Games()` | List Gaming Infos games |
| `Game(game)` | Get game metadata |
| `List(game, type)` | List a complete dataset |
| `Characters(game, name)` | Get one character/skin/roster entity |
| `NPCs(game, name)` | Get one NPC |
| `Maps(game, name)` | Get one map/location |
| `Worlds(game, name)` | Get one world |
| `Groups(game, name)` | Get one group |
| `Players(game, name)` | Get one player |
| `Avatars(game, name)` | Get one avatar |
| `Get(game, type, name)` | Generic Gaming Infos detail lookup |
| `CacheInfo()` | Gaming Infos fallback manifest |
| `Codes()` | Game Codes directory |
| `CodesStatus()` | Game Codes source/sync status |
| `GameCodes(game, options)` | Active/Expired/Unknown code lists |
| `GameCode(game, code, options)` | One redeem/creator code |
| `CodeCacheInfo()` | Game Codes fallback manifest |

## API-first fallback behavior

```text
application
   ↓
live APINODE
   ├─ success → use current live data
   └─ unavailable/error
          ↓
     bundled data/
          ↓
     last-good fallback
```

Set this to force local-only reads:

```bash
GAMING_INFOS_DISABLE_API=1
```

Useful runtime variables:

| Variable | Default |
|---|---|
| `GAMING_INFOS_API_BASE` | `https://api.nekosunevr.co.uk` |
| `GAMING_INFOS_API_PATH` | `/v5/games/api/gaming-infos` |
| `GAME_CODES_API_PATH` | `/v5/games/api/codes` |
| `GAMING_INFOS_TIMEOUT_MS` | `4000` |

## Hourly fallback mirror

The GitHub Action checks APINODE **every hour at minute 23**.

```bash
npm run sync:cache
```

This mirrors both:

```bash
npm run sync:gaming-infos-cache
npm run sync:game-codes-cache
```

The mirror is atomic and last-good-safe:

1. Download a complete snapshot to a temporary tree.
2. Validate all configured endpoints.
3. Calculate hashes and add/change/remove statistics.
4. Replace the old snapshot only after the new one succeeds.
5. Keep the previous snapshot if APINODE is unavailable or any required dataset fails.
6. Commit only when stable content actually changed.

Fortnite is mirrored from these three independent datasets:

```http
GET /v5/games/api/gaming-infos/fortnite/characters
GET /v5/games/api/gaming-infos/fortnite/npcs
GET /v5/games/api/gaming-infos/fortnite/maps
```

Game-code countdown seconds are not stored as meaningful repository changes; fallback countdowns are recalculated from stable expiry dates when read.

See [CACHE_SYNC.md](CACHE_SYNC.md) for the detailed mirror design.

## Cache tests

```bash
npm run test:all-cache
npm run test:cache-sync
npm run test:game-code-cache
```

Tests cover additions, updates, removals, duplicate/invalid data, partial HTTP failures, and last-good snapshot preservation.

## Fallback structure

```text
data/
├── fortnite/
│   ├── meta.json
│   ├── characters/   # released skins / Outfits
│   ├── npcs/         # Battle Royale NPCs
│   └── maps/         # Named Locations / maps
├── genshinimpact/
├── honkaistarrail/
├── nte/
├── wutheringwaves/
├── warframe/
├── zenlesszonezero/
├── toweroffantasy/
├── arknightsendfield/
├── vrchat/
│   ├── players/
│   ├── groups/
│   ├── worlds/
│   └── avatars/
├── .cache-manifest.json
└── game-codes/
    ├── directory.json
    ├── status.json
    ├── .cache-manifest.json
    └── games/
```

## Data policy

Only add publicly available/released data that may be redistributed or referenced appropriately. Do not add private profiles, private messages, authentication data, leaks, unreleased/datamined content, hidden APIs, or client-memory extraction.

## npm fallback note

Published npm releases are immutable. The GitHub repository fallback can update hourly, but an already-installed npm release keeps the files bundled with that release until upgraded. Normal package reads still use live APINODE first when it is available.

## Disclaimer

This project is not affiliated with or endorsed by Epic Games, VRChat Inc., HoYoverse, Kuro Games, Digital Extremes, Hotta Studio, Hypergryph/GRYPHLINE, or other publishers represented by the data. Game names, logos, characters, and related trademarks belong to their respective owners.

Maintained by **NekoSune Projects**.
