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
  let requestTick = 0;

  const directory = () => ({
    success: true,
    games: [
      { game: 'alpha', name: 'Alpha', counts: { total: 2 }, lastUpdatedAt: '2026-08-24T10:00:00.000Z' },
      { game: 'beta', name: 'Beta', counts: { total: 1 }, lastUpdatedAt: '2026-08-24T10:05:00.000Z' }
    ],
    aliases: { a: 'alpha', b: 'beta' },
    // Simulates APINODE's request-time directory timestamp. This must not make
    // an otherwise-identical fallback snapshot look changed.
    updatedAt: new Date(Date.UTC(2026, 7, 24, 10, 10, requestTick++)).toISOString()
  });

  function expiry() {
    return {
      type: 'fixed',
      expiresAt: '2030-12-31T23:59:59.000Z',
      local: '31/12/2030, 23:59:59 UTC',
      expired: false,
      // These are deliberately volatile and should be stripped by the mirror.
      expiresInSeconds: 100000 - requestTick,
      countdown: { days: 1, hours: 2, minutes: 3, seconds: 59 - (requestTick % 50) }
    };
  }

  const datasets = () => ({
    alpha: phase === 1
      ? {
          Active: [
            { code: 'KEEP', status: 'active', expiry: expiry() },
            { code: 'REMOVE', status: 'active', expiry: expiry() }
          ],
          Expired: [],
          Unknown: []
        }
      : {
          Active: [
            { code: 'KEEP', status: 'active', notes: 'changed', expiry: expiry() },
            { code: 'ADD', status: 'active', expiry: expiry() }
          ],
          Expired: [],
          Unknown: []
        },
    beta: { Active: [], Expired: [{ code: 'OLD', status: 'expired', expiry: expiry() }], Unknown: [] }
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
    assert.equal(alpha.Active[0].expiry.expiresAt, '2030-12-31T23:59:59.000Z');
    assert.equal('expiresInSeconds' in alpha.Active[0].expiry, false);
    assert.equal('countdown' in alpha.Active[0].expiry, false);

    phase = 2;
    const second = await syncGameCodeCache({ dataDir, apiBase: 'https://example.test', apiPath: '/v5/games/api/codes', retries: 0, delayMs: 0 });
    assert.equal(second.success, true);
    assert.equal(second.changed, true);
    alpha = JSON.parse(await fs.promises.readFile(path.join(dataDir, 'games', 'alpha.json'), 'utf8'));
    assert.deepEqual(alpha.Active.map((row) => row.code), ['KEEP', 'ADD']);
    assert.equal(alpha.Active[0].notes, 'changed');
    assert.equal(alpha.Active.some((row) => row.code === 'REMOVE'), false);

    // Same real API data, but request-time updatedAt/countdowns change again.
    // The stable snapshot must detect this as unchanged.
    const unchanged = await syncGameCodeCache({ dataDir, apiBase: 'https://example.test', apiPath: '/v5/games/api/codes', retries: 0, delayMs: 0 });
    assert.equal(unchanged.success, true);
    assert.equal(unchanged.changed, false, 'volatile countdown/request timestamps must not create cache commits');

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
