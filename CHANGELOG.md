# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed (Breaking)
- Renamed package from `vrchat-infos` to `gaming-infos` to reflect multi-game support (VRChat today, Genshin Impact and more coming soon).
- `data/` is now scoped per game: `data/<game>/worlds`, `data/<game>/groups`, `data/<game>/players`, `data/<game>/meta.json`. VRChat data moved under `data/vrchat/`.
- Every lookup function now takes a `game` as its first argument, e.g. `Worlds('vrchat', 'theblackcat')` instead of `Worlds('theblackcat')`.
- Added `Game(game)` for game-level meta info, `Characters(game, name)` for character-based games, and a generic `Get(game, type, name)` escape hatch.

### Added
- Lookups now try the NekoSuneVR V5 API first (`GAMING_INFOS_API_BASE`, default `https://api.nekosunevr.co.uk`) and fall back to the bundled local JSON if the API is unreachable, so data can be updated in real time without republishing this package. Set `GAMING_INFOS_DISABLE_API=1` to force local-only lookups.
- Added `genshinimpact`, `nte` (Neverness to Everness), and `honkaistarrail` games, each with `meta.json`.
- Added all 104 currently-released Genshin Impact characters and all 20 currently-playable NTE characters under their respective `data/<game>/characters/` folders, plus Himeko for Honkai: Star Rail. Roughly 60% of these still have a placeholder `"image"` field (`"TODO: add a working portrait/key-art image URL for <Name>"`) where a verified working image URL couldn't be confirmed — swap those in before treating an entry as fully complete.

