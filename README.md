# 🌐 @nekosuneprojects/gaming-infos

A simple Node.js module to load **community game data** — Worlds, Groups, Players, and Characters — for multiple games.
Started as VRChat-only (`vrchat-infos`), now built to grow across games. Currently covers **VRChat**,
**Genshin Impact**, **Neverness to Everness (NTE)**, and **Honkai: Star Rail** — with more to come.

Data is fetched **live from the NekoSuneVR V5 API** first, so the list of games/entries can be updated in real time
without needing a new npm release. If the API can't be reached, it falls back to the JSON bundled in this package.

---

## ✨ Features

- 🎮 Multi-game: every lookup is scoped by `game` (`vrchat`, `genshinimpact`, ...)
- 🌐 API-first with offline fallback — reads from `data/<game>/...` locally when the API is unavailable
- 🧠 Easy-to-use async API
- ❤️ Designed with each game's Terms of Service / Community Guidelines in mind

---

## 📦 Installation

```bash
npm install @nekosuneprojects/gaming-infos
```

## 💡 Usage

```js
const gamingInfos = require('@nekosuneprojects/gaming-infos');

(async () => {
  const game = await gamingInfos.Game('vrchat');
  const world = await gamingInfos.Worlds('vrchat', 'theblackcat');
  const group = await gamingInfos.Groups('vrchat', 'nekosunecommunity');
  const player = await gamingInfos.Players('vrchat', 'nekosunevr');

  console.log(game, world, group, player);
})();
```

This reads (or falls back to reading) data from:

```
data/
└── <game>/
    ├── meta.json
    ├── worlds/<name>.json
    ├── groups/<name>.json
    ├── players/<name>.json
    └── characters/<name>.json   (for character-driven games, e.g. Genshin Impact)
```

### API functions

| Function | Description |
|---|---|
| `Game(game)` | Game-level info, e.g. `data/vrchat/meta.json` |
| `Worlds(game, name)` | A world entry |
| `Groups(game, name)` | A group entry |
| `Players(game, name)` | A player entry |
| `Characters(game, name)` | A character entry (games like Genshin Impact) |
| `Get(game, type, name)` | Generic escape hatch for any other entity type a future game needs |

### Configuration (env vars)

| Variable | Default | Purpose |
|---|---|---|
| `GAMING_INFOS_API_BASE` | `https://api.nekosunevr.co.uk` | Base URL of the NekoSuneVR V5 API |
| `GAMING_INFOS_API_PATH` | `/v5/games/api/gaming-infos` | Path prefix for the gaming-infos endpoint |
| `GAMING_INFOS_DISABLE_API` | unset | Set to `1`/`true` to force local-only lookups (no network calls) |
| `GAMING_INFOS_TIMEOUT_MS` | `4000` | API request timeout before falling back to local JSON |

## 📘 Example JSON Formats

## 🌍 Worlds (`data/<game>/worlds/worldname.json`)

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

## 👥 Groups (`data/<game>/groups/groupname.json`)

```json
{
  "name": "NekoSune Community",
  "owner": "NekoSuneVR",
  "image": "https://example.com/images/group.png",
  "description": "A friendly VRChat group for chill vibes and fun events.",
  "url": "VRCHAT GROUP URL"
}
```

## 🧍 Players (`data/<game>/players/playername.json`)

```json
{
    "name": "NekoSuneVR",
    "title": "The Cutie Streamer",
    "species": "half human - half catgirl",
    "gender": "Male",
    "aliases": "ChisdealHDYT, Chisdeal2013, Chisdeal2014, ChisdealHD, progamer-gr, DarkBlackWolfs",
    "image": "https://media.discordapp.net/attachments/794229972490387496/794231249652678696/VRChat_1920x1080_2020-09-14_09-22-18.855.png",
    "description": "A long time ago, Wild Player Chisdeal2013 (later known as ChisdealHDYT). He had been hanging out in a place called [The Black Cat](https://vrchat-legends.fandom.com/wiki/The_Black_Cat), [The Great Pug](https://vrchat-legends.fandom.com/wiki/The_Great_Pug) and [Japan Shrine (ITOAR)](https://vrchat-legends.fandom.com/wiki/Japan_Shrine_(ITOAR)). He had been talking about how he wanted to be Popular on [Twitch](https://twitch.tv/chisdealhdyt) and [TikTok](https://www.tiktok.com/@chisdealhd) / [YouTube](https://www.youtube.com/chisdealhd). Then he did started to streaming on Twitch and Upload Videos on TikTok / YouTube. He loves interest Cryptocurrency Money making and has lot support from [ZENZO Community](https://zenzo.io). He building Community with VRChat, Warframe and many more. He want become as VTuber as Twitch and doing a lot of VR Gaming. That dream is coming very soon in stage getting VR Headset and Brand new VR Ready PC.\n\nYou should Support this Cutie Streamer much on your Heart it can go.",
    "url": "https://creator.nekosunevr.co.uk"
}
```

## 🧝 Characters (`data/<game>/characters/charactername.json`)

For character-driven games like Genshin Impact:

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

`element` is a plain string (Pyro/Hydro/Electro/Cryo/Anemo/Geo/Dendro) — icon mapping is left to
whatever app consumes this data. `rating` is the in-game star rarity (1-5) as a number. Fields
like `cv` (voice actor) or `city` only apply to some games — include whatever's relevant, drop what isn't.

## 🤝 Pull Requests (PRs)

We welcome contributions, but please follow these important rules carefully — see [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

✅ Permission & Source Rules

- Only include data that is publicly available or that you have permission to include.
- If the data is not public (e.g., from private profiles, Discords, or DMs), do not include it.
- If unsure, ask the world/group/player/character owner first.
- Use only public sources (official game pages/wikis, official listings/profiles).

🚫 Respect & Safety

- No harassment, bullying, or doxxing.
- Any PR containing harassment, defamation, or private information will be rejected and reported.
- Respect each game's Terms of Service and Community Guidelines.
- Do not include private details, logs, or non-public data.

## 🖼️ Image Requirement

Each entry must include a valid image URL in its JSON:
```json
"image": "https://example.com/images/item.png"
```

## 📄 Format Consistency

Follow the exact folder and field structure:

```
data/
└── <game>/
    ├── meta.json
    ├── worlds/
    ├── groups/
    ├── players/
    └── characters/
```

Each JSON should match the examples above.

## 🔍 Accuracy

Ensure all data is accurate, current, and permissioned.

## ⚠️ Disclaimer

This project is not affiliated with or endorsed by VRChat Inc., Genshin Impact/HoYoverse, or any other game covered here.
All names, logos, and related elements are property of their respective owners.
Always follow each game's official Terms of Service and Community Guidelines
(e.g. [VRChat](https://hello.vrchat.com/legal) / [VRChat Community Guidelines](https://hello.vrchat.com/community-guidelines)).

## 🧠 Credits

Maintained by NekoSune Projects
🐾 Contributions welcome — stay game-friendly!

<!-- GitAds-Verify: 2XHQSF1IKOWF4FH8P2TRI5GRWIJG2TJP -->

## GitAds Sponsored
[![Sponsored by GitAds](https://gitads.dev/v1/ad-serve?source=nekosuneprojects/gaming-infos@github)](https://gitads.dev/v1/ad-track?source=nekosuneprojects/gaming-infos@github)
