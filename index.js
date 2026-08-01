const fs = require('fs');
const path = require('path');

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

// Live lookups go through the NekoSuneVR V5 API first so data can be updated
// in real time without republishing this package. The bundled JSON under
// data/ is only the offline fallback for when the API can't be reached.
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
  return JSON.parse(raw);
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

module.exports = {
  // Game-level info, e.g. Game('vrchat') -> data/vrchat/meta.json
  Game: (game) => loadGameMeta(game),

  // Entity lookups, scoped per game: Worlds('vrchat', 'theblackcat')
  Worlds: (game, name) => load(game, 'worlds', name),
  Groups: (game, name) => load(game, 'groups', name),
  Players: (game, name) => load(game, 'players', name),
  Characters: (game, name) => load(game, 'characters', name),

  // Generic escape hatch for entity types not covered above
  // (new games may need types other than worlds/groups/players/characters)
  Get: (game, type, name) => load(game, type, name),
};
