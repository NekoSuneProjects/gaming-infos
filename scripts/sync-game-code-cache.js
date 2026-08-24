'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_DATA_DIR = path.join(ROOT_DIR, 'data', 'game-codes');
const DEFAULT_API_BASE = 'https://api.nekosunevr.co.uk';
const DEFAULT_API_PATH = '/v5/games/api/codes';

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

async function requestJson(url, options = {}) {
  const timeoutMs = numberOption(options.timeoutMs ?? process.env.GAME_CODES_CACHE_TIMEOUT_MS, 15000, 1000, 120000);
  const retries = numberOption(options.retries ?? process.env.GAME_CODES_CACHE_RETRIES, 2, 0, 5);
  const retryDelayMs = numberOption(options.retryDelayMs ?? process.env.GAME_CODES_CACHE_RETRY_DELAY_MS, 750, 0, 30000);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': process.env.GAME_CODES_CACHE_USER_AGENT || 'NekoSuneProjects-gaming-infos-game-codes-cache/1.0'
        }
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} from ${url}`);
        error.status = response.status;
        throw error;
      }
      const body = await response.json();
      if (!body || body.success === false) throw new Error(`API returned an unsuccessful response for ${url}`);
      return body;
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

function apiUrl(base, apiPath, suffix = '', query = {}) {
  const url = new URL(`${normalizeBase(base)}${normalizeApiPath(apiPath)}${suffix}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.href;
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
    if (!fs.existsSync(dataDir) && hadCurrent && fs.existsSync(backupDir)) await fs.promises.rename(backupDir, dataDir);
    throw error;
  }
}

function gameSlug(row) {
  const slug = String(row?.game || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`Invalid game slug in code directory: ${JSON.stringify(row?.game)}`);
  return slug;
}

function validateCodeList(game, payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error(`Invalid code payload for ${game}`);
  if (!Array.isArray(payload.Active) || !Array.isArray(payload.Expired)) throw new Error(`Code payload for ${game} is missing Active/Expired arrays`);
  if (payload.Unknown !== undefined && !Array.isArray(payload.Unknown)) throw new Error(`Unknown codes for ${game} must be an array`);
  return payload;
}

async function buildNextSnapshot(options) {
  const { apiBase, apiPath, dataDir } = options;
  const nextDir = path.join(path.dirname(dataDir), `.game-codes-cache-next-${process.pid}-${Date.now()}`);
  await fs.promises.rm(nextDir, { recursive: true, force: true });
  await fs.promises.mkdir(nextDir, { recursive: true });

  const directory = await requestJson(apiUrl(apiBase, apiPath), options);
  if (!Array.isArray(directory.games) || !directory.games.length) {
    throw new Error('Game code directory returned no games; refusing to replace fallback cache');
  }
  await writeJson(path.join(nextDir, 'directory.json'), directory);

  // /status is cache-only on APINODE and does not trigger source website requests.
  const statusResponse = await requestJson(apiUrl(apiBase, apiPath, '/status'), options);
  const status = statusResponse.data !== undefined ? statusResponse.data : statusResponse;
  if (!status || typeof status !== 'object') throw new Error('Invalid game code status payload');
  await writeJson(path.join(nextDir, 'status.json'), status);

  const counts = {};
  const delayMs = numberOption(options.delayMs ?? process.env.GAME_CODES_CACHE_GAME_DELAY_MS, 150, 0, 10000);
  for (let i = 0; i < directory.games.length; i += 1) {
    const game = gameSlug(directory.games[i]);
    const payload = validateCodeList(
      game,
      await requestJson(apiUrl(apiBase, apiPath, `/${encodeURIComponent(game)}`, { includeUnknown: 'true' }), options)
    );
    await writeJson(path.join(nextDir, 'games', `${game}.json`), payload);
    counts[game] = {
      active: payload.Active.length,
      expired: payload.Expired.length,
      unknown: Array.isArray(payload.Unknown) ? payload.Unknown.length : 0,
      total: payload.Active.length + payload.Expired.length + (Array.isArray(payload.Unknown) ? payload.Unknown.length : 0)
    };
    if (i < directory.games.length - 1 && delayMs) await sleep(delayMs);
  }

  return { nextDir, directory, counts };
}

async function syncGameCodeCache(options = {}) {
  if (typeof fetch !== 'function') throw new Error('Node.js 18+ is required because this sync uses the built-in fetch API');

  const dataDir = path.resolve(options.dataDir || process.env.GAME_CODES_CACHE_DIR || DEFAULT_DATA_DIR);
  const apiBase = options.apiBase || process.env.GAMING_INFOS_API_BASE || DEFAULT_API_BASE;
  const apiPath = options.apiPath || process.env.GAME_CODES_API_PATH || DEFAULT_API_PATH;
  let nextDir;

  try {
    const built = await buildNextSnapshot({ ...options, dataDir, apiBase, apiPath });
    nextDir = built.nextDir;
    const oldFiles = await walkFiles(dataDir);
    const newFiles = await walkFiles(nextDir);
    const oldHash = hashFiles(oldFiles);
    const newHash = hashFiles(newFiles);
    const stats = diffStats(oldFiles, newFiles);

    if (oldFiles.size && oldHash === newHash) {
      await fs.promises.rm(nextDir, { recursive: true, force: true });
      return { success: true, changed: false, contentHash: newHash, source: apiUrl(apiBase, apiPath), counts: built.counts, stats };
    }

    const manifest = {
      schemaVersion: 1,
      source: apiUrl(apiBase, apiPath),
      syncedAt: new Date().toISOString(),
      contentHash: newHash,
      gameCount: built.directory.games.length,
      counts: built.counts,
      statusIsCacheOnly: true,
      stats
    };
    await writeJson(path.join(nextDir, '.cache-manifest.json'), manifest);
    await replaceSnapshot(nextDir, dataDir);
    nextDir = null;
    return { success: true, changed: true, contentHash: newHash, source: manifest.source, counts: built.counts, stats };
  } catch (error) {
    if (nextDir) await fs.promises.rm(nextDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  const result = await syncGameCodeCache();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[game-codes cache] ${error.stack || error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = {
  syncGameCodeCache,
  validateCodeList
};
