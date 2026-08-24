'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_DATA_DIR = path.join(ROOT_DIR, 'data');
const DEFAULT_API_BASE = 'https://api.nekosunevr.co.uk';
const DEFAULT_API_PATH = '/v5/games/api/gaming-infos';

// Safety baseline for older APINODE deployments. Newer APINODE root responses
// expose { slug, types } for every game, so the mirror automatically adds any
// newly published datasets (including the full Call of Duty catalog) without a
// package-code change. Explicit GAMING_INFOS_CACHE_MANIFEST_JSON still works.
const DEFAULT_MANIFEST = Object.freeze({
  vrchat: ['players', 'groups', 'worlds', 'avatars'],
  genshinimpact: ['characters'],
  honkaistarrail: ['characters'],
  nte: ['characters'],
  wutheringwaves: ['characters'],
  warframe: ['characters'],
  fortnite: ['characters', 'npcs', 'maps'],
  zenlesszonezero: ['characters'],
  toweroffantasy: ['characters'],
  arknightsendfield: ['characters']
});

function numberOption(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBase(value) {
  return String(value || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function normalizeApiPath(value) {
  const raw = String(value || DEFAULT_API_PATH).trim();
  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

function safeSlug(value, label = 'slug') {
  const slug = String(value || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9][a-z0-9._-]*$/.test(slug)) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`);
  }
  return slug;
}

function fallbackSlug(name) {
  const slug = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  return safeSlug(slug, 'derived slug');
}

function normalizeManifestObject(parsed) {
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Gaming Infos cache manifest must be a JSON object');
  }
  const result = {};
  for (const [gameRaw, typesRaw] of Object.entries(parsed)) {
    const game = safeSlug(gameRaw, 'game');
    if (!Array.isArray(typesRaw) || !typesRaw.length) throw new Error(`No types configured for ${game}`);
    result[game] = [...new Set(typesRaw.map((type) => safeSlug(type, 'type')))];
  }
  return result;
}

function loadManifest(raw = process.env.GAMING_INFOS_CACHE_MANIFEST_JSON) {
  if (!raw) return { ...DEFAULT_MANIFEST };
  return normalizeManifestObject(typeof raw === 'string' ? JSON.parse(raw) : raw);
}

function mergeDiscoveredManifest(rootData, configuredManifest = DEFAULT_MANIFEST) {
  const result = normalizeManifestObject(configuredManifest);
  for (const row of Array.isArray(rootData) ? rootData : []) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (!row.slug || !Array.isArray(row.types) || !row.types.length) continue;
    const game = safeSlug(row.slug, 'root game slug');
    const types = [...new Set(row.types.map((type) => safeSlug(type, `type for ${game}`)))];
    if (types.length) result[game] = types;
  }
  return result;
}

async function requestJson(url, options = {}) {
  const timeoutMs = numberOption(options.timeoutMs ?? process.env.GAMING_INFOS_CACHE_TIMEOUT_MS, 15000, 1000, 120000);
  const retries = numberOption(options.retries ?? process.env.GAMING_INFOS_CACHE_RETRIES, 2, 0, 5);
  const retryDelayMs = numberOption(options.retryDelayMs ?? process.env.GAMING_INFOS_CACHE_RETRY_DELAY_MS, 750, 0, 30000);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': process.env.GAMING_INFOS_CACHE_USER_AGENT || 'NekoSuneProjects-gaming-infos-cache/1.0'
        }
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} from ${url}`);
        error.status = response.status;
        throw error;
      }

      const body = await response.json();
      if (!body || body.success === false) {
        throw new Error(`API returned an unsuccessful response for ${url}`);
      }
      return body.data !== undefined ? body.data : body;
    } catch (error) {
      lastError = error;
      const status = Number(error.status || 0);
      const retryable = !status || status === 408 || status === 425 || status === 429 || status >= 500;
      if (attempt >= retries || !retryable) break;
      await sleep(retryDelayMs * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

function apiUrl(base, apiPath, suffix = '') {
  return `${normalizeBase(base)}${normalizeApiPath(apiPath)}${suffix}`;
}

async function writeJson(filePath, value) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function walkFiles(dir, root = dir, out = new Map()) {
  if (!fs.existsSync(dir)) return out;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkFiles(full, root, out);
    else if (entry.isFile() && entry.name !== '.cache-manifest.json') {
      const relative = path.relative(root, full).split(path.sep).join('/');
      out.set(relative, await fs.promises.readFile(full));
    }
  }
  return out;
}

function hashFiles(files) {
  const hash = crypto.createHash('sha256');
  for (const [name, content] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    hash.update(name);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function snapshotHash(dir) {
  return hashFiles(await walkFiles(dir));
}

function diffStats(oldFiles, newFiles) {
  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;

  for (const [name, content] of newFiles) {
    if (!oldFiles.has(name)) added += 1;
    else if (!oldFiles.get(name).equals(content)) changed += 1;
    else unchanged += 1;
  }
  for (const name of oldFiles.keys()) if (!newFiles.has(name)) removed += 1;
  return { added, changed, removed, unchanged, total: newFiles.size };
}

async function replaceSnapshot(nextDir, dataDir) {
  const backupDir = `${dataDir}.cache-backup-${process.pid}`;
  await fs.promises.rm(backupDir, { recursive: true, force: true });
  const hadCurrent = fs.existsSync(dataDir);

  if (hadCurrent) await fs.promises.rename(dataDir, backupDir);
  try {
    await fs.promises.rename(nextDir, dataDir);
    await fs.promises.rm(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(dataDir) && hadCurrent && fs.existsSync(backupDir)) {
      await fs.promises.rename(backupDir, dataDir);
    }
    throw error;
  }
}

function normalizedEntry(item) {
  if (!item || Array.isArray(item) || typeof item !== 'object') throw new Error('API list contained a non-object entry');
  const slug = safeSlug(item.slug || fallbackSlug(item.name), 'entry slug');
  return { ...item, slug };
}

async function buildNextSnapshot(options) {
  const { apiBase, apiPath, dataDir, manifest: configuredManifest } = options;
  const parentDir = path.dirname(dataDir);
  const nextDir = path.join(parentDir, `.gaming-infos-cache-next-${process.pid}-${Date.now()}`);
  await fs.promises.rm(nextDir, { recursive: true, force: true });
  await fs.promises.mkdir(nextDir, { recursive: true });

  const rootData = await requestJson(apiUrl(apiBase, apiPath), options);
  if (!Array.isArray(rootData) || !rootData.length) {
    throw new Error('Gaming-infos root endpoint returned no games; refusing to replace the fallback cache');
  }
  const manifest = mergeDiscoveredManifest(rootData, configuredManifest);

  const counts = {};
  for (const [game, types] of Object.entries(manifest)) {
    const meta = await requestJson(apiUrl(apiBase, apiPath, `/${encodeURIComponent(game)}/meta/${encodeURIComponent(game)}`), options);
    if (!meta || Array.isArray(meta) || typeof meta !== 'object') throw new Error(`Invalid meta payload for ${game}`);
    await writeJson(path.join(nextDir, game, 'meta.json'), meta);
    counts[game] = { meta: 1 };

    for (const type of types) {
      const list = await requestJson(apiUrl(apiBase, apiPath, `/${encodeURIComponent(game)}/${encodeURIComponent(type)}`), options);
      if (!Array.isArray(list)) throw new Error(`Expected an array for ${game}/${type}`);

      const seen = new Set();
      counts[game][type] = list.length;
      for (const rawItem of list) {
        const item = normalizedEntry(rawItem);
        if (seen.has(item.slug)) throw new Error(`Duplicate slug ${item.slug} in ${game}/${type}`);
        seen.add(item.slug);
        await writeJson(path.join(nextDir, game, type, `${item.slug}.json`), item);
      }
    }
  }

  return { nextDir, rootGameCount: rootData.length, counts, manifest };
}

async function syncApiCache(options = {}) {
  if (typeof fetch !== 'function') throw new Error('Node.js 18+ is required because this sync uses the built-in fetch API');

  const dataDir = path.resolve(options.dataDir || process.env.GAMING_INFOS_CACHE_DIR || DEFAULT_DATA_DIR);
  const apiBase = options.apiBase || process.env.GAMING_INFOS_API_BASE || DEFAULT_API_BASE;
  const apiPath = options.apiPath || process.env.GAMING_INFOS_API_PATH || DEFAULT_API_PATH;
  const manifest = options.manifest || loadManifest();
  const requestOptions = {
    ...options,
    apiBase,
    apiPath,
    dataDir,
    manifest
  };

  let nextDir;
  try {
    const built = await buildNextSnapshot(requestOptions);
    nextDir = built.nextDir;
    const effectiveManifest = built.manifest;
    const oldFiles = await walkFiles(dataDir);
    const newFiles = await walkFiles(nextDir);
    const oldHash = hashFiles(oldFiles);
    const newHash = hashFiles(newFiles);
    const stats = diffStats(oldFiles, newFiles);

    if (oldFiles.size && oldHash === newHash) {
      await fs.promises.rm(nextDir, { recursive: true, force: true });
      return {
        success: true,
        changed: false,
        contentHash: newHash,
        source: apiUrl(apiBase, apiPath),
        games: Object.keys(effectiveManifest),
        counts: built.counts,
        stats
      };
    }

    const cacheManifest = {
      schemaVersion: 2,
      source: apiUrl(apiBase, apiPath),
      syncedAt: new Date().toISOString(),
      contentHash: newHash,
      rootGameCount: built.rootGameCount,
      autoDiscoveredTypes: true,
      games: Object.fromEntries(Object.entries(effectiveManifest).map(([game, types]) => [game, { types, counts: built.counts[game] }])),
      stats
    };
    await writeJson(path.join(nextDir, '.cache-manifest.json'), cacheManifest);
    await replaceSnapshot(nextDir, dataDir);
    nextDir = null;

    return {
      success: true,
      changed: true,
      contentHash: newHash,
      source: cacheManifest.source,
      games: Object.keys(effectiveManifest),
      counts: built.counts,
      stats
    };
  } catch (error) {
    if (nextDir) await fs.promises.rm(nextDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  const result = await syncApiCache();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[gaming-infos cache] ${error.stack || error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_MANIFEST,
  loadManifest,
  mergeDiscoveredManifest,
  normalizedEntry,
  snapshotHash,
  syncApiCache
};
