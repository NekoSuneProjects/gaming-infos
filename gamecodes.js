'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data', 'game-codes');
const DEFAULT_API_BASE = 'https://api.nekosunevr.co.uk';
const DEFAULT_API_PATH = '/v5/games/api/codes';
const DEFAULT_TIMEOUT_MS = 4000;

function apiBase() {
  return String(process.env.GAMING_INFOS_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function apiPath() {
  const raw = String(process.env.GAME_CODES_API_PATH || DEFAULT_API_PATH).trim();
  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

function apiDisabled() {
  const raw = String(process.env.GAMING_INFOS_DISABLE_API || '').toLowerCase();
  return raw === '1' || raw === 'true';
}

function timeoutMs() {
  const raw = Number(process.env.GAMING_INFOS_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

async function apiGet(suffix = '', query = {}) {
  if (apiDisabled() || typeof fetch !== 'function') return null;

  const url = new URL(`${apiBase()}${apiPath()}${suffix}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body = await response.json();
    if (!body || body.success === false) return null;
    return body;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
}

function safeFallbackPath(fileName) {
  const filePath = path.resolve(DATA_DIR, fileName);
  const root = `${path.resolve(DATA_DIR)}${path.sep}`;
  return filePath.startsWith(root) ? filePath : null;
}

async function readFallback(fileName) {
  const filePath = safeFallbackPath(fileName);
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    return await readJson(filePath);
  } catch (_) {
    return null;
  }
}

function normalizeGame(game) {
  const slug = String(game || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

function normalizeCode(code) {
  return String(code || '').trim().toLowerCase();
}

async function resolveCachedGame(game) {
  const slug = normalizeGame(game);
  if (!slug) return null;
  if (await readFallback(path.join('games', `${slug}.json`))) return slug;

  const cachedDirectory = await readFallback('directory.json');
  const aliasTarget = cachedDirectory?.aliases?.[slug];
  const canonical = normalizeGame(aliasTarget);
  if (canonical && await readFallback(path.join('games', `${canonical}.json`))) return canonical;
  return slug;
}

function hydrateCachedExpiry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const output = { ...entry };
  if (!entry.expiry || typeof entry.expiry !== 'object' || Array.isArray(entry.expiry)) return output;

  const expiry = { ...entry.expiry };
  const expiresAtMs = expiry.expiresAt ? new Date(expiry.expiresAt).getTime() : NaN;
  if (!Number.isNaN(expiresAtMs)) {
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    expiry.expiresInSeconds = remainingSeconds;
    expiry.expired = expiresAtMs <= Date.now();
    expiry.countdown = {
      days: Math.floor(remainingSeconds / 86400),
      hours: Math.floor((remainingSeconds % 86400) / 3600),
      minutes: Math.floor((remainingSeconds % 3600) / 60),
      seconds: remainingSeconds % 60
    };
  } else {
    expiry.expiresInSeconds = null;
    expiry.countdown = null;
  }
  output.expiry = expiry;
  return output;
}

function filterCachedList(data, options = {}) {
  if (!data || typeof data !== 'object') return data;
  const includeUnknown = Boolean(options.includeUnknown);
  const category = options.category ? String(options.category).toLowerCase() : null;
  const claimType = options.claimType ? String(options.claimType).toLowerCase() : null;

  const matches = (entry) => {
    if (!entry || typeof entry !== 'object') return false;
    if (category && String(entry.category || '').toLowerCase() !== category) return false;
    if (claimType && String(entry.claimType || '').toLowerCase() !== claimType) return false;
    return true;
  };

  const hydrate = (rows) => Array.isArray(rows) ? rows.filter(matches).map(hydrateCachedExpiry) : [];
  const result = {
    Active: hydrate(data.Active),
    Expired: hydrate(data.Expired)
  };
  if (includeUnknown) result.Unknown = hydrate(data.Unknown);
  return result;
}

async function directory() {
  const live = await apiGet('');
  if (live) return live;
  const cached = await readFallback('directory.json');
  return cached || { success: false, error: 'Game code directory is unavailable and no fallback cache exists.' };
}

async function status() {
  const live = await apiGet('/status');
  if (live) return live.data !== undefined ? live.data : live;
  const cached = await readFallback('status.json');
  return cached || { error: 'Game code status is unavailable and no fallback cache exists.' };
}

async function gameCodes(game, options = {}) {
  if (!game) return { error: 'game is required' };
  const requested = normalizeGame(game);
  if (!requested) return { error: 'invalid game slug' };
  const query = {
    timezone: options.timezone,
    category: options.category,
    claimType: options.claimType,
    includeUnknown: options.includeUnknown ? 'true' : undefined
  };
  const live = await apiGet(`/${encodeURIComponent(requested)}`, query);
  if (live) return live;

  const cachedGame = await resolveCachedGame(requested);
  const cached = cachedGame ? await readFallback(path.join('games', `${cachedGame}.json`)) : null;
  if (!cached) return { error: `No cached game codes found for "${game}".` };
  return filterCachedList(cached, options);
}

async function gameCode(game, code, options = {}) {
  if (!game || !code) return { error: 'game and code are both required' };
  const requested = normalizeGame(game);
  if (!requested) return { error: 'invalid game slug' };
  const codeValue = String(code).trim();
  const live = await apiGet(`/${encodeURIComponent(requested)}/${encodeURIComponent(codeValue)}`, { timezone: options.timezone });
  if (live) return live.data !== undefined ? live.data : live;

  const cachedGame = await resolveCachedGame(requested);
  const cached = cachedGame ? await readFallback(path.join('games', `${cachedGame}.json`)) : null;
  if (!cached) return { error: `No cached game codes found for "${game}".` };
  const wanted = normalizeCode(codeValue);
  for (const bucket of ['Active', 'Expired', 'Unknown']) {
    for (const entry of Array.isArray(cached[bucket]) ? cached[bucket] : []) {
      if (normalizeCode(entry?.code) === wanted) return hydrateCachedExpiry(entry);
    }
  }
  return { error: `Code "${code}" not found for game "${game}".` };
}

async function cacheInfo() {
  return readFallback('.cache-manifest.json');
}

module.exports = {
  Codes: () => directory(),
  CodesStatus: () => status(),
  GameCodes: (game, options) => gameCodes(game, options),
  GameCode: (game, code, options) => gameCode(game, code, options),
  CodeCacheInfo: () => cacheInfo()
};
