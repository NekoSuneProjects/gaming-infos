# 🌐 @nekosuneprojects/gaming-infos

[![npm version](https://img.shields.io/npm/v/@nekosuneprojects/gaming-infos.svg)](https://www.npmjs.com/package/@nekosuneprojects/gaming-infos)

A Node.js data package for **multi-game information, Fortnite skins/NPCs/maps, Call of Duty characters/NPCs/maps, VRChat community data, redeem codes, and creator codes**.

The package is **API-first**: it reads from the NekoSuneVR V5 API whenever possible, then automatically falls back to bundled JSON when the API is unavailable. The fallback repository checks APINODE every hour and only commits real add/change/remove data updates.

Current package source version: **2.4.0**

> Published npm releases are immutable. The GitHub source can be ahead of the version currently available from the npm registry until a new package release is published.

## Installation

```bash
npm install @nekosuneprojects/gaming-infos
```

Requires Node.js 18+.

## Gaming Infos coverage

| Game / franchise | Slug | Datasets |
|---|---|---|
| VRChat | `vrchat` | `players`, `groups`, `worlds`, `avatars` |
| Genshin Impact | `genshinimpact` | `characters` |
| Honkai: Star Rail | `honkaistarrail` | `characters` |
| Neverness to Everness | `nte` | `characters` |
| Wuthering Waves | `wutheringwaves` | `characters` (Resonators) |
| Warframe | `warframe` | `characters` (Warframes) |
| **Fortnite** | `fortnite` | `characters` = released skins/Outfits, `npcs` = Battle Royale NPCs, `maps` = Named Locations/maps |
| **Call of Duty mainline** | see table below | `characters`, `npcs`, `maps` per title |
| Zenless Zone Zero | `zenlesszonezero` | `characters` (Agents) |
| Tower of Fantasy | `toweroffantasy` | `characters` (Simulacra) |
| Arknights: Endfield | `arknightsendfield` | `characters` (Operators) |

## Call of Duty mainline coverage

Version 2.4.0 adds the mainline PC/console Call of Duty series from the original **Call of Duty (2003)** through **Black Ops 7**, plus **Modern Warfare 4 (2026)** public beta/official announcement data.

| Title | Slug | Year/status |
|---|---|---:|
| Call of Duty | `cod2003` | 2003 |
| Call of Duty 2 | `cod2` | 2005 |
| Call of Duty 3 | `cod3` | 2006 |
| Call of Duty 4: Modern Warfare | `cod4modernwarfare` | 2007 |
| Call of Duty: World at War | `codworldatwar` | 2008 |
| Call of Duty: Modern Warfare 2 | `codmodernwarfare2` | 2009 |
| Call of Duty: Black Ops | `codblackops` | 2010 |
| Call of Duty: Modern Warfare 3 | `codmodernwarfare3` | 2011 |
| Call of Duty: Black Ops II | `codblackops2` | 2012 |
| Call of Duty: Ghosts | `codghosts` | 2013 |
| Call of Duty: Advanced Warfare | `codadvancedwarfare` | 2014 |
| Call of Duty: Black Ops III | `codblackops3` | 2015 |
| Call of Duty: Infinite Warfare | `codinfinitewarfare` | 2016 |
| Call of Duty: WWII | `codwwii` | 2017 |
| Call of Duty: Black Ops 4 | `codblackops4` | 2018 |
| Call of Duty: Modern Warfare (2019) | `codmodernwarfare2019` | 2019 |
| Call of Duty: Black Ops Cold War | `codblackopscoldwar` | 2020 |
| Call of Duty: Vanguard | `codvanguard` | 2021 |
| Call of Duty: Modern Warfare II | `codmodernwarfareii2022` | 2022 |
| Call of Duty: Modern Warfare III | `codmodernwarfareiii2023` | 2023 |
| Call of Duty: Black Ops 6 | `codblackops6` | 2024 |
| Call of Duty: Black Ops 7 | `codblackops7` | 2025 |
| Call of Duty: Modern Warfare 4 | `codmodernwarfare4` | 2026 beta / announced launch |

### Call of Duty dataset rules

Each Call of Duty title uses the same three public datasets:

```text
<cod-slug>/characters → playable/main characters, protagonists, Operators and Specialists
<cod-slug>/npcs       → other campaign/game character and NPC records
<cod-slug>/maps       → multiplayer, Zombies, Warzone and other public map/mission records
```

Historical released titles are populated from public Call of Duty Wiki game-specific categories. APINODE excludes categories marked cut, unused, cancelled, unreleased, non-canon, prototype/concept, screenshot/image-only, or file-only.

`codmodernwarfare4` is handled more strictly while the game is pre-release: only **officially published Activision beta/public announcement information** is accepted. Leaks, datamines, hidden APIs, and unofficial unreleased lists are not imported. Campaign NPCs are not invented; they only appear once publicly identified by an allowed source.

Examples:

```js
const bo2Characters = await info.List('codblackops2', 'characters');
const mw2CampaignNpcs = await info.List('codmodernwarfare2', 'npcs');
const cod4Maps = await info.List('cod4modernwarfare', 'maps');
const mw4PublicMaps = await info.List('codmodernwarfare4', 'maps');

const oneCharacter = await info.Characters('codblackops2', 'character-slug');
const oneNpc = await info.NPCs('codblackops2', 'npc-slug');
const oneMap = await info.Maps('codblackops2', 'map-slug');
```

## Fortnite dataset rules

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

  const blackOps2Characters = await info.List('codblackops2', 'characters');
  const blackOps2Npcs = await info.List('codblackops2', 'npcs');
  const blackOps2Maps = await info.List('codblackops2', 'maps');

  const vrchatWorlds = await info.List('vrchat', 'worlds');

  console.log({
    games: games.length,
    fortniteSkins: fortniteSkins.length,
    blackOps2Characters: blackOps2Characters.length,
    blackOps2Npcs: blackOps2Npcs.length,
    blackOps2Maps: blackOps2Maps.length,
    vrchatWorlds: vrchatWorlds.length,
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

The root endpoint publishes each game's stable `slug` and available `types`. Type-list responses publish stable entity `slug` values for detail lookups.

Examples:

```http
GET /v5/games/api/gaming-infos/codblackops2/characters
GET /v5/games/api/gaming-infos/codblackops2/npcs
GET /v5/games/api/gaming-infos/codblackops2/maps
GET /v5/games/api/gaming-infos/codmodernwarfare4/characters
GET /v5/games/api/gaming-infos/codmodernwarfare4/maps
```

### Main helpers

```js
await info.Games();
await info.Game('codblackops2');

await info.List('codblackops2', 'characters');
await info.List('codblackops2', 'npcs');
await info.List('codblackops2', 'maps');

await info.Characters('codblackops2', 'character-slug');
await info.NPCs('codblackops2', 'npc-slug');
await info.Maps('codblackops2', 'map-slug');

await info.Worlds('vrchat', 'world-slug');
await info.Groups('vrchat', 'group-slug');
await info.Players('vrchat', 'player-slug');
await info.Avatars('vrchat', 'avatar-slug');

await info.Get('codblackops2', 'maps', 'map-slug');
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
| `Characters(game, name)` | Get one character/skin/Operator/roster entity |
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

Gaming Infos now **auto-discovers games and dataset types** from the APINODE root response. The built-in manifest remains a compatibility/safety baseline for older APINODE deployments, but when the API reports:

```json
{
  "slug": "codblackops2",
  "types": ["characters", "npcs", "maps"]
}
```

the mirror automatically includes all three datasets. This is how all Call of Duty titles are picked up without hard-coding 23 package mirror entries, and it also makes future public game/type additions easier to propagate.

The mirror is atomic and last-good-safe:

1. Download the root Gaming Infos directory and merge its `slug`/`types` declarations into the effective mirror manifest.
2. Download every game meta + every discovered/configured dataset to a temporary tree.
3. Validate all required endpoints and entity slugs.
4. Calculate hashes and add/change/remove statistics.
5. Replace the old snapshot only after the new one succeeds completely.
6. Keep the previous snapshot if APINODE is unavailable or any required dataset fails.
7. Commit only when stable content actually changed.

Game-code countdown seconds are not stored as meaningful repository changes; fallback countdowns are recalculated from stable expiry dates when read.

See [CACHE_SYNC.md](CACHE_SYNC.md) for the detailed mirror design.

## Cache tests

```bash
npm run test:all-cache
npm run test:cache-sync
npm run test:game-code-cache
```

Tests cover additions, updates, removals, duplicate/invalid data, dynamic APINODE dataset discovery, partial HTTP failures, and last-good snapshot preservation.

## Fallback structure

After APINODE has populated a title and the hourly mirror has completed successfully, the repository structure includes entries like:

```text
data/
├── fortnite/
│   ├── meta.json
│   ├── characters/
│   ├── npcs/
│   └── maps/
├── codblackops2/
│   ├── meta.json
│   ├── characters/
│   ├── npcs/
│   └── maps/
├── codmodernwarfare4/
│   ├── meta.json
│   ├── characters/
│   ├── npcs/
│   └── maps/
├── ...
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

Only add publicly available released data, or clearly official public beta/announcement information for a currently pre-release title. Do not add private profiles, private messages, authentication data, leaks, unofficial unreleased lists, datamined content, hidden APIs, or client-memory extraction.

## npm fallback note

Published npm releases are immutable. The GitHub repository fallback can update hourly, but an already-installed npm release keeps the files bundled with that release until upgraded. Normal package reads still use live APINODE first when it is available.

## Disclaimer

This project is not affiliated with or endorsed by Activision, Epic Games, VRChat Inc., HoYoverse, Kuro Games, Digital Extremes, Hotta Studio, Hypergryph/GRYPHLINE, or other publishers represented by the data. Game names, logos, characters, and related trademarks belong to their respective owners.

Maintained by **NekoSune Projects**.
