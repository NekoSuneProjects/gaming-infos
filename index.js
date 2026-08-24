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
function apiPath() { return process.env.GAMING_INFOS_API_PATH || DEFAULT_API_PATH; }
function apiDisabled() { return process.env.GAMING_INFOS_DISABLE_API === '1' || process.env.GAMING_INFOS_DISABLE_API === 'true'; }
function timeoutMs() {
  const raw = Number(process.env.GAMING_INFOS_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}
function boundedInt(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback;
}
function withLocalSlug(filePath, data) {
  if (!data || Array.isArray(data) || typeof data !== 'object' || data.slug) return data;
  return { ...data, slug: path.basename(filePath, '.json').toLowerCase() };
}

async function requestApi(url) {
  if (apiDisabled() || typeof fetch !== 'function') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const body = await res.json();
    return !body || body.success === false ? null : body;
  } catch (_) {
    return null;
  } finally { clearTimeout(timer); }
}

async function fetchFromApi(game, type, name) {
  const body = await requestApi(`${apiBase()}${apiPath()}/${encodeURIComponent(game.toLowerCase())}/${encodeURIComponent(type)}/${encodeURIComponent(name.toLowerCase())}`);
  return body ? (body.data !== undefined ? body.data : body) : null;
}

async function loadLocal(game, type, name) {
  const filePath = path.join(DATA_DIR, game.toLowerCase(), type, `${name.toLowerCase()}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`${type} "${name}" not found for game "${game}"`);
  return withLocalSlug(filePath, JSON.parse(await fs.promises.readFile(filePath, 'utf8')));
}

async function fetchListFromApi(game, type) {
  const body = await requestApi(`${apiBase()}${apiPath()}/${encodeURIComponent(game.toLowerCase())}/${encodeURIComponent(type)}`);
  if (!body) return null;
  const data = body.data !== undefined ? body.data : body;
  return Array.isArray(data) ? data : null;
}

async function fetchListPageFromApi(game, type, options = {}) {
  const params = new URLSearchParams();
  params.set('page', String(boundedInt(options.page, 1, 1, 1000000)));
  params.set('pageSize', String(boundedInt(options.pageSize, 48, 1, 100)));
  if (options.q) params.set('q', String(options.q).trim().slice(0, 200));
  const body = await requestApi(`${apiBase()}${apiPath()}/${encodeURIComponent(game.toLowerCase())}/${encodeURIComponent(type)}?${params}`);
  if (!body) return null;
  const data = body.data !== undefined ? body.data : body;
  if (!Array.isArray(data)) return null;
  if (body.pagination) return { data, pagination: body.pagination, query: body.query || String(options.q || ''), source: 'api' };

  // Compatibility with an older APINODE that ignored page parameters.
  return pageRows(data, options, 'api');
}

async function listLocal(game, type) {
  const dir = path.join(DATA_DIR, game.toLowerCase(), type);
  if (!fs.existsSync(dir)) return [];
  const files = (await fs.promises.readdir(dir)).filter((file) => file.endsWith('.json')).sort((a, b) => a.localeCompare(b));
  const items = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    items.push(withLocalSlug(filePath, JSON.parse(await fs.promises.readFile(filePath, 'utf8'))));
  }
  return items;
}

function pageRows(rows, options = {}, source = 'fallback') {
  const q = String(options.q || '').trim().toLowerCase();
  const filtered = q ? rows.filter((row) => {
    try { return JSON.stringify(row).toLowerCase().includes(q); } catch (_) { return false; }
  }) : rows;
  const pageSize = boundedInt(options.pageSize, 48, 1, 100);
  const requested = boundedInt(options.page, 1, 1, 1000000);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, totalPages);
  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
    query: String(options.q || ''),
    source
  };
}

async function list(game, type) {
  if (!game || !type) return { error: 'game and type are both required' };
  const fromApi = await fetchListFromApi(game, type);
  if (fromApi) return fromApi;
  try { return await listLocal(game, type); } catch (err) { return { error: err.message }; }
}

async function listPage(game, type, options = {}) {
  if (!game || !type) return { error: 'game and type are both required' };
  const fromApi = await fetchListPageFromApi(game, type, options);
  if (fromApi) return fromApi;
  try { return pageRows(await listLocal(game, type), options, 'fallback'); }
  catch (err) { return { error: err.message }; }
}

async function fetchGamesFromApi() {
  const body = await requestApi(`${apiBase()}${apiPath()}`);
  if (!body) return null;
  const data = body.data !== undefined ? body.data : body;
  return Array.isArray(data) ? data : null;
}

async function listGamesLocal() {
  const entries = await fs.promises.readdir(DATA_DIR, { withFileTypes: true });
  const games = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'game-codes') continue;
    const metaPath = path.join(DATA_DIR, entry.name, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    games.push(JSON.parse(await fs.promises.readFile(metaPath, 'utf8')));
  }
  return games;
}

async function games() {
  const fromApi = await fetchGamesFromApi();
  if (fromApi) return fromApi;
  try { return await listGamesLocal(); } catch (err) { return { error: err.message }; }
}

async function load(game, type, name) {
  if (!game || !type || !name) return { error: 'game, type, and name are all required' };
  const fromApi = await fetchFromApi(game, type, name);
  if (fromApi) return fromApi;
  try { return await loadLocal(game, type, name); } catch (err) { return { error: err.message }; }
}

async function loadGameMeta(game) {
  if (!game) return { error: 'game is required' };
  const fromApi = await fetchFromApi(game, 'meta', game);
  if (fromApi) return fromApi;
  try {
    const filePath = path.join(DATA_DIR, game.toLowerCase(), 'meta.json');
    if (!fs.existsSync(filePath)) throw new Error(`meta info for game "${game}" not found`);
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  } catch (err) { return { error: err.message }; }
}

async function cacheInfo() {
  try {
    const filePath = path.join(DATA_DIR, '.cache-manifest.json');
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
  } catch (err) { return { error: err.message }; }
}

module.exports = {
  Games: () => games(),
  Game: (game) => loadGameMeta(game),
  Worlds: (game, name) => load(game, 'worlds', name),
  Groups: (game, name) => load(game, 'groups', name),
  Players: (game, name) => load(game, 'players', name),
  Avatars: (game, name) => load(game, 'avatars', name),
  Characters: (game, name) => load(game, 'characters', name),
  NPCs: (game, name) => load(game, 'npcs', name),
  Maps: (game, name) => load(game, 'maps', name),
  Get: (game, type, name) => load(game, type, name),
  List: (game, type) => list(game, type),
  ListPage: (game, type, options) => listPage(game, type, options),
  CacheInfo: () => cacheInfo(),
  Codes: gameCodes.Codes,
  CodesStatus: gameCodes.CodesStatus,
  GameCodes: gameCodes.GameCodes,
  GameCode: gameCodes.GameCode,
  CodeCacheInfo: gameCodes.CodeCacheInfo
};
