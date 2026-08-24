# APINODE fallback-cache mirror

`@nekosuneprojects/gaming-infos` is API-first: normal reads try `https://api.nekosunevr.co.uk/v5/games/api/gaming-infos` before using the bundled `data/` directory.

The repository now also keeps that bundled fallback synchronized automatically.

## Mirrored datasets

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

## How synchronization works

The scheduled GitHub Action runs every six hours and can also be started manually.

1. Fetch the root gaming-infos endpoint.
2. Fetch every configured game's `meta` endpoint.
3. Fetch every configured type-list endpoint.
4. Validate every response and every entry slug.
5. Write a completely separate temporary snapshot.
6. Compare the new snapshot with the current `data/` tree.
7. Only after **every request and validation succeeds**, atomically replace `data/`.
8. Commit the changed fallback JSON to `main`.

Because the API snapshot is authoritative, a successful sync mirrors additions, changes **and removals**. If an entry disappears from APINODE, its fallback JSON is removed too.

A failed or partial sync never replaces `data/`. If APINODE is down, times out, returns an error, or one configured endpoint is missing, the last good fallback remains untouched.

## Commands

```bash
npm run test:cache-sync
npm run sync:cache
```

Override the API when testing:

```bash
GAMING_INFOS_API_BASE=http://localhost:3000 npm run sync:cache
```

Useful environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `GAMING_INFOS_API_BASE` | `https://api.nekosunevr.co.uk` | APINODE host |
| `GAMING_INFOS_API_PATH` | `/v5/games/api/gaming-infos` | API path prefix |
| `GAMING_INFOS_CACHE_TIMEOUT_MS` | `15000` | Per-request timeout |
| `GAMING_INFOS_CACHE_RETRIES` | `2` | Retry count for network/429/5xx failures |
| `GAMING_INFOS_CACHE_RETRY_DELAY_MS` | `750` | Retry backoff base delay |
| `GAMING_INFOS_CACHE_DIR` | repository `data/` | Destination snapshot directory |
| `GAMING_INFOS_CACHE_MANIFEST_JSON` | built-in manifest | Optional JSON object for extending game/type mappings |

## Cache manifest

A successful changed snapshot contains `data/.cache-manifest.json` with the source URL, content hash, per-game counts, and add/change/remove statistics.

The sync does not rewrite the snapshot when the API content hash has not changed, so the scheduled workflow does not create empty timestamp-only commits.

## Runtime behavior

The package still performs live reads first. If APINODE cannot be reached, `index.js` falls back to the mirrored local JSON. This means the cache job does not add an extra network request to normal library calls; it only keeps the offline dataset current in the repository/package source.

Note: npm releases are immutable. The repository fallback updates automatically, but a previously installed npm version retains the bundled snapshot from that release until the package is upgraded. Live API reads still return current data while APINODE is available.
