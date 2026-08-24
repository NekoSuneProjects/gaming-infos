# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 2.2.0 - 2026-08-24

### Added
- Added API-first Game Codes helpers: `Codes()`, `CodesStatus()`, `GameCodes(game, options)`, `GameCode(game, code, options)`, and `CodeCacheInfo()`.
- Added an atomic `data/game-codes/` fallback mirror for `/v5/games/api/codes`, cache-only `/status`, and every per-game Active/Expired/Unknown dataset.
- Added game-code fallback alias resolution using the cached `/codes` directory aliases.
- Added game-code cache smoke tests covering additions, changes, removals, and partial API outages.
- Added `Avatars(game, name)` for VRChat avatar records.
- Added public Gaming Infos support for Wuthering Waves Resonators, Warframe Warframes, Fortnite current/released Battle Royale characters, Zenless Zone Zero Agents, Tower of Fantasy Simulacra, and Arknights: Endfield Operators.
- Expanded the mirrored VRChat datasets to include players, groups, worlds, and avatars.
- Added `CacheInfo()` for inspecting the last mirrored Gaming Infos snapshot.
- Added automatic fallback-cache manifests with source URL, content hash, counts, and add/change/remove statistics.

### Changed
- `npm run sync:cache` now mirrors both Gaming Infos and Game Codes.
- The automatic cache workflow now runs once daily at 03:23 UTC instead of every six hours.
- Gaming Infos and Game Codes are mirrored as independent atomic snapshots so a failure in one cache cannot destroy the other cache's last-good data.
- Successful mirror runs now synchronize additions, updates, and removals from APINODE while failed or partial runs preserve the previous fallback snapshot.
- Local fallback entities expose stable slugs so offline lookups match live API behavior more closely.
- Expanded the package description and keywords for the new games, VRChat avatars, and redeem/creator-code support.
- Reworked `README.md` to document the full supported-game matrix, API-first fallback behavior, Game Codes API helpers, daily sync workflow, cache commands, configuration, and examples.

## 2.1.0 - 2026-08-02

### Added
- `List(game, type)` returns every entry of a type for a game, e.g. `List('genshinimpact', 'characters')` returns all 104 character objects. Tries the API's list endpoint first, falls back to reading the local folder.
- `Games()` returns every supported game's meta info in one call. Tries the API's root list endpoint first, falls back to reading every local `meta.json`.
- Added 68 Honkai: Star Rail character records, completing the bundled 69-character dataset alongside the existing Himeko record.
- Added 12 VRChat group records, 15 player records, and 20 world records.

### Changed
- Character/entity entries that have no verified working image now use `"image": ""` instead of a `"TODO: ..."` placeholder string.
- Expanded the README with `Games()` and `List(game, type)` usage and documented how consumers should handle empty image values.
- Updated the API integration guide for the all-games, type-list, single-entity, and game-meta routes, including endpoint registration and response shapes.
- Split the combined NekoSuneVR Animations 2023-2024 world record into individual 2023 and 2024 records and added a 2025 record.

## 2.0.0 - 2026-08-02

### Changed (Breaking)
- Renamed package from `vrchat-infos` to `gaming-infos` to reflect multi-game support (VRChat today, Genshin Impact and more coming soon).
- `data/` is now scoped per game: `data/<game>/worlds`, `data/<game>/groups`, `data/<game>/players`, `data/<game>/meta.json`. VRChat data moved under `data/vrchat/`.
- Every lookup function now takes a `game` as its first argument, e.g. `Worlds('vrchat', 'theblackcat')` instead of `Worlds('theblackcat')`.
- Added `Game(game)` for game-level info, `Characters(game, name)` for character-based games, and a generic `Get(game, type, name)` escape hatch.

### Added
- Lookups now try the NekoSuneVR V5 API first (`GAMING_INFOS_API_BASE`, default `https://api.nekosunevr.co.uk`) and fall back to the bundled local JSON if the API is unreachable, so data can be updated in real time without republishing this package. Set `GAMING_INFOS_DISABLE_API=1` to force local-only lookups.
- Added `genshinimpact`, `nte` (Neverness to Everness), and `honkaistarrail` games, each with `meta.json`.
- Added all 104 currently-released Genshin Impact characters, all 20 currently-playable NTE characters, and all 69 currently-released Honkai: Star Rail characters under their respective `data/<game>/characters/` folders.
