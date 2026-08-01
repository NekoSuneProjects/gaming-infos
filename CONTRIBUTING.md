# 🤝 Contributing to @nekosuneprojects/gaming-infos

Thank you for your interest in contributing to **@nekosuneprojects/gaming-infos**!
This project relies on community help to keep game data organized, accurate, and friendly — across every game it covers,
not just VRChat.

Please read this guide carefully **before submitting a Pull Request (PR)**.

---

## 🦊 Overview

This project provides **community game info** — worlds, groups, players, characters, and more — in JSON format, used by
scripts and tools. Data lives in the `data/` folder, scoped per game:

```
data/
└── <game>/
    ├── meta.json
    ├── worlds/
    ├── groups/
    ├── players/
    └── characters/
```

Each JSON file represents a public piece of info about a world, group, player, or character for that game.
Not every game uses every folder — e.g. VRChat uses `worlds`/`groups`/`players`, while a character-driven game like
Genshin Impact mainly uses `characters`. Use the `Get(game, type, name)` function for any entity type a new game
needs that isn't already listed above.

---

## ✅ Contribution Rules

### 1. Permission & Privacy

- Only include **publicly available data** or **data you have explicit permission** to share.
- If the data comes from **private profiles, Discord servers, or DMs**, **do not submit it**.
- You must **ask permission** from the world/group/player/character owner if the information is not publicly listed.
- Do **not** upload personal or sensitive details under any circumstance.

### 2. Accepted Public Sources

You may use:
- Official game wikis/fandoms (e.g. [VRChat Legends (Fandom)](https://vrchat-legends.fandom.com), official Genshin Impact wiki, etc.)
- Official game pages, group listings, or public user profiles.
- Other verified public sources (must be referenced in the PR description).

If the source is not verifiable or permission is unclear, your PR will be closed.

---

## 🚫 Community & Safety Guidelines

All contributions must comply with the relevant game's Terms of Service and Community Guidelines, e.g. for VRChat:

- **VRChat's Terms of Service**:
  [https://hello.vrchat.com/legal](https://hello.vrchat.com/legal)

- **VRChat's Community Guidelines**:
  [https://hello.vrchat.com/community-guidelines](https://hello.vrchat.com/community-guidelines)

### Forbidden Content:
- Harassment, bullying, or targeted remarks.
- Doxxing or sharing private user data.
- Hate speech, NSFW content, or anything that violates a game's ToS or GitHub rules.
- False, misleading, or defamatory information.

Such PRs will be rejected and may result in a report to platform moderators.

---

## 🖼️ Image Requirement

Every JSON file **must include an `image` field** linking to a **safe, representative image** (world thumbnail, group
logo, avatar/character art).

Example:
```json
"image": "https://example.com/images/world.png"
```

Images must not contain:
- Private or copyrighted art without permission.
- NSFW or offensive visuals.

---

## 🧩 JSON Format Guidelines

Follow these formats exactly when adding files. New games should follow the same shape for whichever entity types
apply to them.

### 🌍 Worlds (`data/<game>/worlds/worldname.json`)
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

### 👥 Groups (`data/<game>/groups/groupname.json`)
```json
{
  "name": "NekoSune Community",
  "owner": "NekoSuneVR",
  "image": "https://example.com/images/group.png",
  "description": "A friendly VRChat group for chill vibes and fun events.",
  "url": "VRCHAT GROUP URL"
}
```

### 🧍 Players (`data/<game>/players/playername.json`)
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

### 🧝 Characters (`data/<game>/characters/charactername.json`)
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
`element` stays a plain string (icon mapping is a consumer-side concern, not stored here).
`rating` is the in-game star rarity (1-5) as a number. Include whatever fields apply to that
game's characters (`cv`, `city`, etc.) and drop what doesn't.

### 🎮 Game meta (`data/<game>/meta.json`)
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

---

## 🪶 How to Submit a Pull Request

1. **Fork** this repository.
2. **Create a new branch** for your changes:
   ```bash
   git checkout -b add-new-world
   ```
3. Add or update JSON files under `data/<game>/...`. If adding a **new game**, create `data/<newgame>/meta.json`
   plus whichever entity folders apply (`worlds`, `groups`, `players`, `characters`, or a new type via `Get()`).
4. Ensure your files are valid JSON and properly formatted.
5. **Commit and push** your changes:
   ```bash
   git commit -m "Add Example World info"
   git push origin add-new-world
   ```
6. **Open a Pull Request** on GitHub with:
   - A clear title (e.g., "Add Genshin Impact character Furina")
   - A short explanation
   - Source links or permissions if applicable

---

## 🔍 Before Submitting

✅ Validate your JSON syntax using:
```bash
npm run lint
```
(if available) or an online JSON validator.

✅ Make sure:
- You have **permission** to share the content.
- The **image link** works and is safe.
- The **file name matches the item name** (lowercase recommended).
- The file is in the correct `data/<game>/<type>/` folder.

---

## 🧠 Final Notes

- This project is **game-friendly** and follows all relevant ToS and Community Guidelines.
- The maintainers reserve the right to remove or edit contributions that break policy.
- All content remains under the [MIT License](LICENSE) unless otherwise noted.

---

🐾 Maintained by **NekoSune Projects**
💬 Community contributions are welcome — just keep it kind, safe, and respectful!
