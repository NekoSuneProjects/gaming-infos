# Gaming Infos — Data & API Spec

> **Forward this file into `V5_REBUILD_GREEN`.** It's the shared spec between the
> `@nekosuneprojects/gaming-infos` npm package and the V5 API. The npm package now calls the API
> first for live data and only falls back to its own bundled JSON if the API is unreachable — so
> once this is wired up here, the game/character list can be updated in real time by editing JSON
> in this repo, without ever needing to bump the npm package version.

## What this covers

Community info about games — worlds, groups, players, characters, and whatever else a future game
needs — as small JSON files. Today: VRChat. Coming soon: Genshin Impact, and more. Each game only
uses the entity types that make sense for it (VRChat: worlds/groups/players. A character-driven
game like Genshin Impact: mostly characters.).

This is **not** the same thing as the existing `src/routes/v5/games/*` routes (Destiny2, Fortnite,
Hypixel, VRChat profile lookup, etc.) — those pull *live player/account stats* from third-party
game APIs. `gaming-infos` is curated, hand-written community reference data (bios, lore, links),
served as static JSON.

---

## 1. Where the JSON lives

Create this folder structure under the API project root:

```
V5_REBUILD_GREEN/
└── data/
    └── gaming-infos/
        └── <game>/
            ├── meta.json
            ├── worlds/<name>.json
            ├── groups/<name>.json
            ├── players/<name>.json
            └── characters/<name>.json
```

Rules:
- `<game>` is lowercase, no spaces, e.g. `vrchat`, `genshinimpact`.
- `<name>` (the filename, minus `.json`) is lowercase, no spaces, e.g. `theblackcat.json`, `furina.json`.
- Only create the entity folders a game actually uses — don't create empty `worlds/` for a game with no worlds.
- `meta.json` holds game-level info (see schema below) and is required for every game.

This mirrors the npm package's own `data/<game>/...` layout 1:1, so JSON can be copied between the
two repos without any transformation.

---

## 2. JSON schemas

### Game meta — `data/gaming-infos/<game>/meta.json`
```json
{
  "name": "Genshin Impact",
  "title": "An open-world action RPG developed by HoYoverse.",
  "engine": "Unity",
  "Platform": "PC, PlayStation, iOS, Android",
  "Release date": "September 28, 2020",
  "Genre": "Action RPG, Open World, Gacha",
  "developers": "HoYoverse",
  "aliases": "GI, Genshin",
  "image": "https://example.com/images/genshin-logo.png",
  "description": "Short factual description of the game.",
  "url": "https://en.wikipedia.org/wiki/Genshin_Impact"
}
```

### World — `data/gaming-infos/<game>/worlds/<name>.json`
```json
{
  "name": "The Black Cat",
  "title": "Main Hall",
  "creator": "spookyghostboo",
  "aliases": "Black Cat",
  "image": "https://example.com/images/world.jpg",
  "description": "A cozy hangout world for friends.",
  "url": "VRCHAT WORLD URL"
}
```

### Group — `data/gaming-infos/<game>/groups/<name>.json`
```json
{
  "name": "NekoSune Community",
  "owner": "NekoSuneVR",
  "image": "https://example.com/images/group.png",
  "description": "A friendly VRChat group for chill vibes and fun events.",
  "url": "VRCHAT GROUP URL"
}
```

### Player — `data/gaming-infos/<game>/players/<name>.json`
```json
{
  "name": "NekoSuneVR",
  "title": "The Cutie Streamer",
  "species": "half human - half catgirl",
  "gender": "Male",
  "aliases": "ChisdealHDYT, Chisdeal2013",
  "image": "https://example.com/images/nekosunevr.png",
  "description": "Bio text, markdown links allowed.",
  "url": "https://creator.nekosunevr.co.uk"
}
```

### Character — `data/gaming-infos/<game>/characters/<name>.json`
```json
{
    "name": "Amber",
    "quote": "Outrider Amber, at the ready!",
    "cv": "Iwami Manaka",
    "description": "A perky, straightforward girl, who is also the only Outrider of the Knights of Favonius.",
    "image": "https://uploadstatic-sea.mihoyo.com/contentweb/20191009/2019100914372396510.png",
    "city": "Mondstadt",
    "url": "https://genshin.mihoyo.com/en/character/mondstadt?char=1",
    "element": "Pyro",
    "weapon": "Bow",
    "rating": 4
}
```
- `element` is a plain string (Pyro/Hydro/Electro/Cryo/Anemo/Geo/Dendro) — no icon URL stored here;
  element -> icon mapping is a consumer-side concern.
- `rating` is the in-game star rarity (1-5) as a number.
- `cv` (voice actor) and `city` are Genshin-specific; other character-driven games can drop/replace
  them with whatever fields fit (e.g. a fighting game might use `moveset` instead of `city`).

Every entity JSON **must** include an `image` field with a working, safe (non-NSFW, not privately
owned without permission) URL.

If a game needs an entity type not listed above (e.g. `weapons`, `regions`, `guilds`), just add a
new folder following the same `data/gaming-infos/<game>/<type>/<name>.json` pattern — the npm
package's `Get(game, type, name)` function reads any type generically.

---

## 3. Sourcing & safety rules

- Only use **publicly available** info, or info you have explicit permission to publish.
- Never include data from private profiles, private Discords, or DMs.
- No harassment, doxxing, defamation, or NSFW content.
- Respect each game's Terms of Service / Community Guidelines (e.g. VRChat's
  [ToS](https://hello.vrchat.com/legal) and [Community Guidelines](https://hello.vrchat.com/community-guidelines)).
- Prefer official wikis/fandoms and official game pages as sources; note the source in your PR/commit if unclear.

---

## 4. Wiring up the API route

Follow the existing pattern used by every other file in `src/routes/v5/games/*`
(`checkEndpointEnabled` + `requireApiKeyIfNeeded` middleware, mounted under `/v5/games/api/...`).

1. Create `src/routes/v5/games/gaminginfos.js`:

```js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { checkEndpointEnabled, requireApiKeyIfNeeded } = require('../../../middleware/apiAccess');

const router = express.Router({ strict: false });
const DATA_DIR = path.join(__dirname, '..', '..', '..', '..', 'data', 'gaming-infos');

router.get('/:game/:type/:name', checkEndpointEnabled, requireApiKeyIfNeeded, async (req, res) => {
  const { game, type, name } = req.params;
  const filePath = path.join(DATA_DIR, game.toLowerCase(), type.toLowerCase(), `${name.toLowerCase()}.json`);

  if (!filePath.startsWith(DATA_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: `${type} "${name}" not found for game "${game}"` });
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return res.status(200).json({ success: true, data: JSON.parse(raw) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to read gaming-infos data.' });
  }
});

router.get('/:game/meta/:name', checkEndpointEnabled, requireApiKeyIfNeeded, async (req, res) => {
  const { game } = req.params;
  const filePath = path.join(DATA_DIR, game.toLowerCase(), 'meta.json');

  if (!filePath.startsWith(DATA_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: `meta info for game "${game}" not found` });
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    return res.status(200).json({ success: true, data: JSON.parse(raw) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to read gaming-infos meta.' });
  }
});

module.exports = router;
```

2. Register it in `src/app.js` next to the other game routes:

```js
const gamingInfosRoutes = require('./routes/v5/games/gaminginfos');
// ...
app.use('/v5/games/api/gaming-infos', gamingInfosRoutes);
```

3. Add the endpoint(s) to `DEFAULT_ENDPOINTS` in `src/services/bootstrap.js` so
   `checkEndpointEnabled` accepts them (same convention as every other `games/api/*` entry):

```js
{
  path: '/v5/games/api/gaming-infos/:game/:type/:name',
  method: 'GET',
  isEnabled: true,
  requiresApiKey: false,
  description: 'Community gaming-infos lookup (worlds/groups/players/characters/etc.)'
},
{
  path: '/v5/games/api/gaming-infos/:game/meta/:name',
  method: 'GET',
  isEnabled: true,
  requiresApiKey: false,
  description: 'Gaming-infos game meta lookup'
},
```

Run whatever seeds `DEFAULT_ENDPOINTS` into the DB (e.g. the bootstrap step run on startup/migration)
so the toggles actually exist — `checkEndpointEnabled` 404s any path not found in the `EndpointToggle`
table.

The npm package expects responses shaped as `{ success: true, data: {...} }` (or a bare JSON object —
it accepts either) and defaults to `https://api.nekosunevr.co.uk/v5/games/api/gaming-infos` as the
base URL. If the real public host differs, override it per-consumer via the `GAMING_INFOS_API_BASE`
env var — nothing here needs to change either way.

---

## 5. Prompt template — adding/updating a game or entry

Copy-paste this (filling in the brackets) when asking an AI assistant to add or refresh gaming-infos
data in this repo:

```
Add/update gaming-infos data in this repo (data/gaming-infos/), following DATA.md:

- Game: <e.g. Genshin Impact>
- Entity type: <world|group|player|character|other>
- Name(s): <e.g. Furina, Nahida>
- Source(s): <official wiki/page URL(s) — public only, no private info>

Look up current, accurate public info for each name above, write one JSON file per entry at
data/gaming-infos/<game>/<type>/<lowercase-name>.json matching the schema in DATA.md section 2
(include a working, safe image URL), and create/update data/gaming-infos/<game>/meta.json if this
is a new game. Don't touch the API route code unless it doesn't exist yet for this game group —
DATA.md section 4 has the route setup if needed. Skip anything that isn't publicly sourced or
permissioned.
```
