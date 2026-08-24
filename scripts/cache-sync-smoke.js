'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const {
  DEFAULT_MANIFEST,
  mergeDiscoveredManifest,
  validateRootSyncState,
  syncApiCache
} = require('./sync-api-cache');

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

async function main() {
  assert.deepStrictEqual(
    DEFAULT_MANIFEST.fortnite,
    ['characters', 'npcs', 'maps'],
    'Fortnite fallback mirror must keep skins, NPCs, and maps as separate datasets'
  );

  const discovered = mergeDiscoveredManifest(
    [
      { slug: 'codblackops2', name: 'Call of Duty: Black Ops II', types: ['characters', 'npcs', 'maps'] },
      { slug: 'futuregame', name: 'Future Public Game', types: ['characters', 'maps'] }
    ],
    { testgame: ['characters'] }
  );
  assert.deepStrictEqual(discovered.testgame, ['characters']);
  assert.deepStrictEqual(discovered.codblackops2, ['characters', 'npcs', 'maps']);
  assert.deepStrictEqual(discovered.futuregame, ['characters', 'maps']);

  assert.doesNotThrow(() => validateRootSyncState({
    sync: {
      running: false,
      syncSchemaVersion: 2,
      state: { lastStatus: 'success', syncSchemaVersion: 2, requiredSyncSchemaVersion: 2 }
    }
  }));
  assert.throws(() => validateRootSyncState({ sync: { running: true, state: { lastStatus: 'running' } } }), /currently running/);
  assert.throws(() => validateRootSyncState({ sync: { running: false, state: { lastStatus: 'failed' } } }), /state is failed/);
  assert.throws(() => validateRootSyncState({
    sync: {
      running: false,
      syncSchemaVersion: 2,
      state: { lastStatus: 'success', syncSchemaVersion: 1, requiredSyncSchemaVersion: 2 }
    }
  }), /schema catch-up is incomplete/);

  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'gaming-infos-cache-test-'));
  const dataDir = path.join(root, 'data');
  let failCharacters = false;
  let characters = [
    { slug: 'alpha', name: 'Alpha', value: 1 },
    { slug: 'beta', name: 'Beta', value: 2 }
  ];

  const server = http.createServer((req, res) => {
    if (req.url === '/v5/games/api/gaming-infos') {
      return json(res, 200, {
        success: true,
        data: [{ slug: 'testgame', name: 'Test Game', types: ['characters'] }],
        sync: {
          running: false,
          syncSchemaVersion: 2,
          state: { lastStatus: 'success', syncSchemaVersion: 2, requiredSyncSchemaVersion: 2 }
        }
      });
    }
    if (req.url === '/v5/games/api/gaming-infos/testgame/meta/testgame') {
      return json(res, 200, { success: true, data: { slug: 'testgame', name: 'Test Game', description: 'fixture', types: ['characters'] } });
    }
    if (req.url === '/v5/games/api/gaming-infos/testgame/characters') {
      if (failCharacters) return json(res, 503, { success: false, error: 'fixture outage' });
      return json(res, 200, { success: true, data: characters });
    }
    return json(res, 404, { success: false, error: 'not found' });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const apiBase = `http://127.0.0.1:${address.port}`;
  const options = {
    apiBase,
    apiPath: '/v5/games/api/gaming-infos',
    dataDir,
    manifest: { testgame: ['characters'] },
    retries: 0,
    timeoutMs: 3000
  };

  try {
    const first = await syncApiCache(options);
    assert.strictEqual(first.changed, true);
    assert.ok(fs.existsSync(path.join(dataDir, 'testgame', 'characters', 'alpha.json')));
    assert.ok(fs.existsSync(path.join(dataDir, 'testgame', 'characters', 'beta.json')));

    characters = [
      { slug: 'alpha', name: 'Alpha', value: 99 },
      { slug: 'gamma', name: 'Gamma', value: 3 }
    ];
    const second = await syncApiCache(options);
    assert.strictEqual(second.changed, true);
    assert.strictEqual(second.stats.added, 1);
    assert.strictEqual(second.stats.removed, 1);
    assert.ok(second.stats.changed >= 1);
    assert.strictEqual(JSON.parse(await fs.promises.readFile(path.join(dataDir, 'testgame', 'characters', 'alpha.json'), 'utf8')).value, 99);
    assert.ok(fs.existsSync(path.join(dataDir, 'testgame', 'characters', 'gamma.json')));
    assert.ok(!fs.existsSync(path.join(dataDir, 'testgame', 'characters', 'beta.json')));

    const beforeOutage = await fs.promises.readFile(path.join(dataDir, 'testgame', 'characters', 'alpha.json'), 'utf8');
    failCharacters = true;
    let failed = false;
    try {
      await syncApiCache(options);
    } catch (_) {
      failed = true;
    }
    assert.strictEqual(failed, true, 'partial API outage must fail the sync');
    assert.strictEqual(await fs.promises.readFile(path.join(dataDir, 'testgame', 'characters', 'alpha.json'), 'utf8'), beforeOutage);
    assert.ok(fs.existsSync(path.join(dataDir, 'testgame', 'characters', 'gamma.json')), 'last good snapshot must survive an outage');

    console.log('gaming-infos cache sync smoke test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.promises.rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
