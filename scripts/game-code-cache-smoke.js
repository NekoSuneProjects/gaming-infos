'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { syncGameCodeCache } = require('./sync-game-code-cache');

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; }
  };
}

async function main() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'game-code-cache-'));
  const dataDir = path.join(temp, 'game-codes');
  let phase = 1;

  const directory = () => ({
    success: true,
    games: [
      { game: 'alpha', name: 'Alpha', counts: { total: phase === 1 ? 2 : 2 } },
      { game: 'beta', name: 'Beta', counts: { total: 1 } }
    ],
    aliases: { a: 'alpha', b: 'beta' }
  });

  const datasets = () => ({
    alpha: phase === 1
      ? { Active: [{ code: 'KEEP', status: 'active' }, { code: 'REMOVE', status: 'active' }], Expired: [], Unknown: [] }
      : { Active: [{ code: 'KEEP', status: 'active', notes: 'changed' }, { code: 'ADD', status: 'active' }], Expired: [], Unknown: [] },
    beta: { Active: [], Expired: [{ code: 'OLD', status: 'expired' }], Unknown: [] }
  });

  const originalFetch = global.fetch;
  global.fetch = async (input) => {
    const url = new URL(String(input));
    if (phase === 3 && url.pathname.endsWith('/beta')) return response({ success: false }, 503);
    if (url.pathname.endsWith('/codes')) return response(directory());
    if (url.pathname.endsWith('/codes/status')) return response({ success: true, data: { generic: { ok: true }, specialized: [] } });
    const game = url.pathname.split('/').pop();
    if (datasets()[game]) return response(datasets()[game]);
    return response({ success: false }, 404);
  };

  try {
    const first = await syncGameCodeCache({ dataDir, apiBase: 'https://example.test', apiPath: '/v5/games/api/codes', retries: 0, delayMs: 0 });
    assert.equal(first.success, true);
    assert.equal(fs.existsSync(path.join(dataDir, 'games', 'alpha.json')), true);
    let alpha = JSON.parse(await fs.promises.readFile(path.join(dataDir, 'games', 'alpha.json'), 'utf8'));
    assert.deepEqual(alpha.Active.map((row) => row.code), ['KEEP', 'REMOVE']);

    phase = 2;
    const second = await syncGameCodeCache({ dataDir, apiBase: 'https://example.test', apiPath: '/v5/games/api/codes', retries: 0, delayMs: 0 });
    assert.equal(second.success, true);
    alpha = JSON.parse(await fs.promises.readFile(path.join(dataDir, 'games', 'alpha.json'), 'utf8'));
    assert.deepEqual(alpha.Active.map((row) => row.code), ['KEEP', 'ADD']);
    assert.equal(alpha.Active[0].notes, 'changed');
    assert.equal(alpha.Active.some((row) => row.code === 'REMOVE'), false);

    const beforeFailure = await fs.promises.readFile(path.join(dataDir, 'games', 'alpha.json'), 'utf8');
    phase = 3;
    await assert.rejects(
      () => syncGameCodeCache({ dataDir, apiBase: 'https://example.test', apiPath: '/v5/games/api/codes', retries: 0, delayMs: 0 }),
      /503/
    );
    const afterFailure = await fs.promises.readFile(path.join(dataDir, 'games', 'alpha.json'), 'utf8');
    assert.equal(afterFailure, beforeFailure, 'failed partial sync must preserve last-good code cache');

    const status = JSON.parse(await fs.promises.readFile(path.join(dataDir, 'status.json'), 'utf8'));
    assert.equal(status.generic.ok, true);
    console.log('game-code-cache smoke test passed');
  } finally {
    global.fetch = originalFetch;
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
