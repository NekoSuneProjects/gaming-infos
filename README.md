# 🌐 @nekosuneprojects/gaming-infos

[![npm version](https://img.shields.io/npm/v/@nekosuneprojects/gaming-infos.svg)](https://www.npmjs.com/package/@nekosuneprojects/gaming-infos)

A Node.js data package for **game information, VRChat community data, characters, redeem codes, and creator codes**.

The package is **API-first**: it reads from the NekoSuneVR V5 API whenever possible, then automatically falls back to bundled JSON when the API is unavailable. The fallback data in this repository is checked against APINODE every hour using an atomic add/change/remove synchronization system; unchanged API data creates no commit.

Current package version: **2.2.0**

---

## ✨ What it provides

- 🎮 Multi-game metadata and character data
- 🌐 Live NekoSuneVR V5 API lookups
- 💾 Automatic local JSON fallback when the API is unavailable
- 🔄 Hourly APINODE → repository change-watch
- 🧹 Add/change/remove mirroring so deleted API entries disappear from the next successful fallback snapshot
- 🛡️ Last-good-cache protection if APINODE is down or a sync only partially succeeds
- 👤 VRChat players
- 👥 VRChat groups
- 🌍 VRChat worlds
- 🧍 VRChat avatars
- 🧝 Character/roster datasets for supported games
- 🎁 Redeem-code and creator-code helpers
- 📊 Game-code directory, counts, aliases, status, and source-cache information
- 🧪 Offline smoke tests for cache replacement and failure recovery

---

## 🎮 Gaming Infos coverage

| Game | Slug | Data |
|---|---|---|
| VRChat | `vrchat` | players, groups, worlds, avatars |
| Genshin Impact | `genshinimpact` | characters |
| Honkai: Star Rail | `honkaistarrail` | characters |
| Neverness to Everness | `nte` | characters |
| Wuthering Waves | `wutheringwaves` | Resonators under `characters` |
| Warframe | `warframe` | Warframes under `characters` |
| Fortnite | `fortnite` | current/released Battle Royale characters |
| Zenless Zone Zero | `zenlesszonezero` | Agents under `characters` |
| Tower of Fantasy | `toweroffantasy` | Simulacra under `characters` |
| Arknights: Endfield | `arknightsendfield` | Operators under `characters` |

The Game Codes system is separate and its supported game list is returned dynamically by the APINODE `/codes` directory endpoint.

---

## 📦 Installation

```bash
npm install @nekosuneprojects/gaming-infos
```

Requires **Node.js 18 or newer**.

---

# 🚀 Quick start

```js
const gamingInfos = require('@nekosuneprojects/gaming-infos');

async function main() {
  const games = await gamingInfos.Games();
  const vrchat = await gamingInfos.Game('vrchat');

  const worlds = await gamingInfos.List('vrchat', 'worlds');
  const avatars = await gamingInfos.List('vrchat', 'avatars');
  const genshinCharacters = await gamingInfos.List('genshinimpact', 'characters');
  const wuwaCharacters = await gamingInfos.List('wutheringwaves', 'characters');

  console.log({
    gameCount: games.length,
    vrchat,
    worlds: worlds.length,
    avatars: avatars.length,
    genshinCharacters: genshinCharacters.length,
    wuwaCharacters: wuwaCharacters.length
  });
}

main();
```

---

# 🧠 Gaming Infos API

## `Games()`

Returns every game with bundled/API Gaming Infos metadata.

```js
const games = await gamingInfos.Games();
```

Live endpoint:

```http
GET /v5/games/api/gaming-infos
```

## `Game(game)`

Returns game-level metadata.

```js
const game = await gamingInfos.Game('warframe');
```

## `List(game, type)`

Returns every entity for a game/type.

```js
const resonators = await gamingInfos.List('wutheringwaves', 'characters');
const agents = await gamingInfos.List('zenlesszonezero', 'characters');
const operators = await gamingInfos.List('arknightsendfield', 'characters');
const vrchatGroups = await gamingInfos.List('vrchat', 'groups');
```

Live endpoint:

```http
GET /v5/games/api/gaming-infos/:game/:type
```

## Single-entity helpers

```js
await gamingInfos.Worlds('vrchat', 'world-slug');
await gamingInfos.Groups('vrchat', 'group-slug');
await gamingInfos.Players('vrchat', 'player-slug');
await gamingInfos.Avatars('vrchat', 'avatar-slug');
await gamingInfos.Characters('warframe', 'warframe-slug');
```

Generic lookup:

```js
await gamingInfos.Get('vrchat', 'worlds', 'world-slug');
```

Live endpoint:

```http
GET /v5/games/api/gaming-infos/:game/:type/:name
```

The V5 API returns stable `slug` values for list entries. Use those slugs for detail lookups instead of trying to generate filenames from display names yourself.

## `CacheInfo()`

Reads information about the last mirrored Gaming Infos fallback snapshot.

```js
const cache = await gamingInfos.CacheInfo();
console.log(cache?.syncedAt, cache?.contentHash);
```

---

# 🎁 Game Codes API

Version 2.2.0 adds API-first redeem-code and creator-code support using the same fallback model.

APINODE endpoints:

```http
GET /v5/games/api/codes
GET /v5/games/api/codes/status
GET /v5/games/api/codes/:game
GET /v5/games/api/codes/:game/:code
```

`/codes/status` is cache/status data only and does **not** trigger website scraping or a source refresh.

## `Codes()`

Returns the Game Codes directory, including supported games, aliases, metadata, counters, source counts, and endpoint information.

```js
const directory = await gamingInfos.Codes();

console.log(directory.games);
console.log(directory.aliases);
```

## `CodesStatus()`

Returns the cached source-refresh state.

```js
const status = await gamingInfos.CodesStatus();
```

## `GameCodes(game, options)`

Returns code lists using the existing APINODE response shape:

```js
const fortniteCodes = await gamingInfos.GameCodes('fortnite');

console.log(fortniteCodes.Active);
console.log(fortniteCodes.Expired);
```

Default shape:

```json
{
  "Active": [],
  "Expired": []
}
```

Include queued/unknown records:

```js
const allFortniteCodes = await gamingInfos.GameCodes('fortnite', {
  includeUnknown: true
});
```

Which can return:

```json
{
  "Active": [],
  "Expired": [],
  "Unknown": []
}
```

Filtering is supported:

```js
const creatorCodes = await gamingInfos.GameCodes('fortnite', {
  category: 'creator-code',
  includeUnknown: true
});

const freeCodes = await gamingInfos.GameCodes('genshin-impact', {
  claimType: 'free'
});
```

Timezone can also be passed through to the live API:

```js
const codes = await gamingInfos.GameCodes('fortnite', {
  timezone: 'Europe/London',
  includeUnknown: true
});
```

Cached aliases from the `/codes` directory are resolved during API outages as well, so aliases such as `fn`, `genshin`, `hsr`, or `wuwa` can still map to their canonical cached game dataset.

## `GameCode(game, code, options)`

Looks up one specific code.

```js
const creator = await gamingInfos.GameCode('fortnite', 'NEKOSUNEVR');
console.log(creator);
```

Live endpoint:

```http
GET /v5/games/api/codes/:game/:code
```

When APINODE is unavailable, the package searches the locally mirrored Active, Expired, and Unknown code buckets.

## `CodeCacheInfo()`

Returns the local Game Codes cache manifest.

```js
const codeCache = await gamingInfos.CodeCacheInfo();
console.log(codeCache?.syncedAt, codeCache?.stats);
```

---

# 📚 Function reference

| Function | Purpose |
|---|---|
| `Games()` | List Gaming Infos games |
| `Game(game)` | Get game metadata |
| `List(game, type)` | List every entry for one game/type |
| `Worlds(game, name)` | Get one world |
| `Groups(game, name)` | Get one group |
| `Players(game, name)` | Get one player |
| `Avatars(game, name)` | Get one avatar |
| `Characters(game, name)` | Get one character/Warframe/Agent/etc. |
| `Get(game, type, name)` | Generic entity lookup |
| `CacheInfo()` | Gaming Infos fallback manifest |
| `Codes()` | Game Codes directory |
| `CodesStatus()` | Cached Game Codes source status |
| `GameCodes(game, options)` | Active/Expired/Unknown code lists |
| `GameCode(game, code, options)` | One specific redeem/creator code |
| `CodeCacheInfo()` | Game Codes fallback manifest |

---

# 💾 API-first fallback behavior

Normal reads follow this path:

```text
Application
   │
   ▼
NekoSuneVR V5 API
   │
   ├── available ──► return live data
   │
   └── unavailable
          │
          ▼
     bundled data/
          │
          ▼
     return last-good fallback
```

The package does not need an API key for the public read endpoints documented above.

Set this to force local-only reads:

```bash
GAMING_INFOS_DISABLE_API=1
```

---

# 🔄 Hourly fallback synchronization

The repository automatically checks APINODE **every hour at minute 23 UTC** through GitHub Actions.

This is a change-watch, not an unconditional rewrite: content hashes are compared first, so if APINODE has not changed, no fallback commit is created. If APINODE adds/changes/removes data or repairs an image/code record, the next successful hourly pass mirrors that update.

The combined command is:

```bash
npm run sync:cache
```

That performs both:

```bash
npm run sync:gaming-infos-cache
npm run sync:game-codes-cache
```

The synchronization process is designed to be authoritative and failure-safe:

1. Download the complete configured API snapshot into a temporary directory.
2. Validate all required responses.
3. Calculate content hashes and add/change/remove statistics.
4. Replace the old fallback only after the new snapshot succeeds completely.
5. Keep the previous fallback untouched if the API fails, times out, returns an error, or produces an incomplete snapshot.
6. Commit actual fallback changes back to the repository.

Successful syncs mirror **additions, modifications, repairs, and removals**. If APINODE removes an entry, that entry is removed from the fallback during the next successful mirror.

Gaming Infos and Game Codes use independent atomic caches so a failure in one dataset cannot destroy the last-good snapshot of the other.

See [CACHE_SYNC.md](CACHE_SYNC.md) for the detailed cache architecture.

---

# 🧪 Cache tests

Run all cache safety tests:

```bash
npm run test:all-cache
```

Or individually:

```bash
npm run test:cache-sync
npm run test:game-code-cache
```

The tests cover scenarios including:

- new entries appearing
- existing entries changing
- upstream entries being removed
- duplicate/invalid data protection
- partial API failures
- simulated HTTP 5xx outages
- preserving the last-good fallback after a failed sync

---

# 📁 Fallback data structure

```text
data/
├── genshinimpact/
│   ├── meta.json
│   └── characters/
├── honkaistarrail/
├── nte/
├── wutheringwaves/
├── warframe/
├── fortnite/
├── zenlesszonezero/
├── toweroffantasy/
├── arknightsendfield/
├── vrchat/
│   ├── meta.json
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
        └── <game>.json
```

An entity with no verified image can use:

```json
{
  "image": ""
}
```

Consumers should treat a blank image string as "no verified image available".

---

# ⚙️ Environment variables

## Runtime API reads

| Variable | Default | Purpose |
|---|---|---|
| `GAMING_INFOS_API_BASE` | `https://api.nekosunevr.co.uk` | NekoSuneVR APINODE base URL |
| `GAMING_INFOS_API_PATH` | `/v5/games/api/gaming-infos` | Gaming Infos path |
| `GAME_CODES_API_PATH` | `/v5/games/api/codes` | Game Codes path |
| `GAMING_INFOS_DISABLE_API` | unset | `1`/`true` forces local-only operation |
| `GAMING_INFOS_TIMEOUT_MS` | `4000` | Runtime API timeout before fallback |

## Cache mirror

| Variable | Default | Purpose |
|---|---|---|
| `GAMING_INFOS_CACHE_TIMEOUT_MS` | `15000` | Gaming Infos sync request timeout |
| `GAMING_INFOS_CACHE_RETRIES` | `2` | Gaming Infos retry count |
| `GAMING_INFOS_CACHE_RETRY_DELAY_MS` | `750` | Gaming Infos retry delay |
| `GAME_CODES_CACHE_TIMEOUT_MS` | `15000` | Game Codes sync request timeout |
| `GAME_CODES_CACHE_RETRIES` | `2` | Game Codes retry count |
| `GAME_CODES_CACHE_RETRY_DELAY_MS` | `750` | Game Codes retry delay |
| `GAME_CODES_CACHE_GAME_DELAY_MS` | small delay | Delay between per-game code snapshots |

---

# 📝 Example character entry

Different games expose different fields. Consumers should use the fields relevant to that game rather than assuming every title has the same schema.

```json
{
  "name": "Example Character",
  "slug": "examplecharacter",
  "rarity": "5-star",
  "element": "Electro",
  "weapon": "Sword",
  "description": "Public character information.",
  "image": "https://example.com/character.webp",
  "url": "https://example.com/source",
  "source": {
    "provider": "Public source",
    "publicDataOnly": true
  }
}
```

---

# 🤝 Contributions

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Please follow these rules:

- Only include publicly available data or data you have permission to publish.
- Do not include private profiles, private Discord messages, DMs, private logs, authentication data, or personal information.
- Do not add leaks, datamined/unreleased content, hidden APIs, memory-inspection data, or client-extracted private data.
- Respect each game's Terms of Service and community rules.
- Keep sources clear and verifiable.
- Do not submit harassment, defamation, doxxing, or invasive profile information.

---

# ⚠️ Package fallback note

GitHub repository cache snapshots update automatically, but published npm packages are immutable.

An already-installed npm release keeps the fallback JSON bundled with that release until you update the package. While APINODE is online, live API reads still provide current data without requiring a package release.

---

# ⚠️ Disclaimer

This project is not affiliated with or endorsed by VRChat Inc., HoYoverse, Kuro Games, Digital Extremes, Epic Games, Hotta Studio, Hypergryph/GRYPHLINE, or any other game publisher represented by the data.

Game names, logos, characters, and related trademarks belong to their respective owners.

---

# 🧠 Credits

Maintained by **NekoSune Projects**.

Contributions are welcome — keep the data public, accurate, and game-friendly.

<!-- GitAds-Verify: 2XHQSF1IKOWF4FH8P2TRI5GRWIJG2TJP -->

## GitAds Sponsored
[![Sponsored by GitAds](https://gitads.dev/v1/ad-serve?source=nekosuneprojects/gaming-infos@github)](https://gitads.dev/v1/ad-track?source=nekosuneprojects/gaming-infos@github)
