# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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

## 2.0.0

### Changed (Breaking)
- Renamed package from `vrchat-infos` to `gaming-infos` to reflect multi-game support (VRChat today, Genshin Impact and more coming soon).
- `data/` is now scoped per game: `data/<game>/worlds`, `data/<game>/groups`, `data/<game>/players`, `data/<game>/meta.json`. VRChat data moved under `data/vrchat/`.
- Every lookup function now takes a `game` as its first argument, e.g. `Worlds('vrchat', 'theblackcat')` instead of `Worlds('theblackcat')`.
- Added `Game(game)` for game-level meta info, `Characters(game, name)` for character-based games, and a generic `Get(game, type, name)` escape hatch.

### Added
- Lookups now try the NekoSuneVR V5 API first (`GAMING_INFOS_API_BASE`, default `https://api.nekosunevr.co.uk`) and fall back to the bundled local JSON if the API is unreachable, so data can be updated in real time without republishing this package. Set `GAMING_INFOS_DISABLE_API=1` to force local-only lookups.
- Added `genshinimpact`, `nte` (Neverness to Everness), and `honkaistarrail` games, each with `meta.json`.
- Added all 104 currently-released Genshin Impact characters, all 20 currently-playable NTE characters, and all 69 currently-released Honkai: Star Rail characters under their respective `data/<game>/characters/` folders.

