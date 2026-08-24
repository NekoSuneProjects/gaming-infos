const fs = require('fs');
const path = require('path');
const gameCodes = require('./gamecodes');

const DATA_DIR = path.join(__dirname, 'data');
const DEFAULT_API_BASE = 'https://api.nekosunevr.co.uk';
const DEFAULT_API_PATH = '/v5/games/api/gaming-infos';
const DEFAULT_TIMEOUT_MS = 4000;

function apiBase() {
  return (process.env.GAMING_INFOS_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function apiPath() {
  return process.env.GAMING_INFOS_API_PATH || DEFAULT_API_PATH;
}

function apiDisabled() {
  return process.env.GAMING_INFOS_DISABLE_API === '1' || process.env.GAMING_INFOS_DISABLE_API === 'true';
}

function timeoutMs() {
  const raw = Number(process.env.GAMING_INFOS_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function withLocalSlug(filePath, data) {
  if (!data || Array.isArray(data) || typeof data !== 'object' || data.slug) return data;
  return { ...data, slug: path.basename(filePath, '.json').toLowerCase() };
}

// Live lookups go through the NekoSuneVR V5 API first so data can be updated
// in real time without republishing this package. The bundled JSON under
// data/ is the offline fallback and is mirrored from APINODE by the scheduled
// sync workflow.
async function fetchFromApi(game, type, name) {
  if (apiDisabled() || typeof fetch !== 'function') return null;

  const url = `${apiBase()}${apiPath()}/${encodeURIComponent(game.toLowerCase())}/${encodeURIComponent(type)}/${encodeURIComponent(name.toLowerCase())}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.success === false) return null;
    return body.data !== undefined ? body.data : body;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadLocal(game, type, name) {
  const filePath = path.join(DATA_DIR, game.toLowerCase(), type, `${name.toLowerCase()}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${type} "${name}" not found for game "${game}"`);
  }

  const raw = await fs.promises.readFile(filePath, 'utf8');
  return withLocalSlug(filePath, JSON.parse(raw));
}

async function fetchListFromApi(game, type) {
  if (apiDisabled() || typeof fetch !== 'function') return null;

  const url = `${apiBase()}${apiPath()}/${encodeURIComponent(game.toLowerCase())}/${encodeURIComponent(type)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.success === false) return null;
    const data = body.data !== undefined ? body.data : body;
    return Array.isArray(data) ? data : null;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function listLocal(game, type) {
  const dir = path.join(DATA_DIR, game.toLowerCase(), type);
  if (!fs.existsSync(dir)) return [];

  const files = (await fs.promises.readdir(dir)).filter((file) => file.endsWith('.json')).sort((a, b) => a.localeCompare(b));
  const items = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const raw = await fs.promises.readFile(filePath, 'utf8');
    items.push(withLocalSlug(filePath, JSON.parse(raw)));
  }
  return items;
}

async function list(game, type) {
  if (!game || !type) {
    return { error: 'game and type are both required' };
  }

  const fromApi = await fetchListFromApi(game, type);
  if (fromApi) return fromApi;

  try {
    return await listLocal(game, type);
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchGamesFromApi() {
  if (apiDisabled() || typeof fetch !== 'function') return null;

  const url = `${apiBase()}${apiPath()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || body.success === false) return null;
    const data = body.data !== undefined ? body.data : body;
    return Array.isArray(data) ? data : null;
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function listGamesLocal() {
  const entries = await fs.promises.readdir(DATA_DIR, { withFileTypes: true });
  const games = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'game-codes') continue;
    const metaPath = path.join(DATA_DIR, entry.name, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    const raw = await fs.promises.readFile(metaPath, 'utf8');
    games.push(JSON.parse(raw));
  }
  return games;
}

async function games() {
  const fromApi = await fetchGamesFromApi();
  if (fromApi) return fromApi;

  try {
    return await listGamesLocal();
  } catch (err) {
    return { error: err.message };
  }
}

async function load(game, type, name) {
  if (!game || !type || !name) {
    return { error: 'game, type, and name are all required' };
  }

  const fromApi = await fetchFromApi(game, type, name);
  if (fromApi) return fromApi;

  try {
    return await loadLocal(game, type, name);
  } catch (err) {
    return { error: err.message };
  }
}

async function loadGameMeta(game) {
  if (!game) return { error: 'game is required' };

  const fromApi = await fetchFromApi(game, 'meta', game);
  if (fromApi) return fromApi;

  try {
    const filePath = path.join(DATA_DIR, game.toLowerCase(), 'meta.json');
    if (!fs.existsSync(filePath)) {
      throw new Error(`meta info for game "${game}" not found`);
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { error: err.message };
  }
}

async function cacheInfo() {
  try {
    const filePath = path.join(DATA_DIR, '.cache-manifest.json');
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = {
  Games: () => games(),
  Game: (game) => loadGameMeta(game),
  Worlds: (game, name) => load(game, 'worlds', name),
  Groups: (game, name) => load(game, 'groups', name),
  Players: (game, name) => load(game, 'players', name),
  Avatars: (game, name) => load(game, 'avatars', name),
  Characters: (game, name) => load(game, 'characters', name),
  Get: (game, type, name) => load(game, type, name),
  List: (game, type) => list(game, type),
  CacheInfo: () => cacheInfo(),

  // Game redeem/creator code API helpers. These also use live APINODE first and
  // automatically fall back to the daily mirrored data/game-codes snapshot.
  Codes: gameCodes.Codes,
  CodesStatus: gameCodes.CodesStatus,
  GameCodes: gameCodes.GameCodes,
  GameCode: gameCodes.GameCode,
  CodeCacheInfo: gameCodes.CodeCacheInfo
};
