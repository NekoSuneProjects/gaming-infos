'use strict';

const fs = require('fs');
const path = require('path');
const { syncApiCache } = require('./sync-api-cache');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const GAME_CODES_DIR = path.join(DATA_DIR, 'game-codes');

async function syncGamingInfoCacheSafely(options = {}) {
  const dataDir = path.resolve(options.dataDir || process.env.GAMING_INFOS_CACHE_DIR || DATA_DIR);
  const gameCodesDir = path.join(dataDir, 'game-codes');
  const preserveDir = path.join(path.dirname(dataDir), `.game-codes-preserve-${process.pid}-${Date.now()}`);
  let preserved = false;

  try {
    if (fs.existsSync(gameCodesDir)) {
      await fs.promises.rm(preserveDir, { recursive: true, force: true });
      await fs.promises.rename(gameCodesDir, preserveDir);
      preserved = true;
    }

    return await syncApiCache({ ...options, dataDir });
  } finally {
    if (preserved && fs.existsSync(preserveDir)) {
      await fs.promises.mkdir(dataDir, { recursive: true });
      await fs.promises.rm(gameCodesDir, { recursive: true, force: true });
      await fs.promises.rename(preserveDir, gameCodesDir);
    }
  }
}

async function main() {
  const result = await syncGamingInfoCacheSafely();
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[gaming-infos cache] ${error.stack || error.message || error}`);
    process.exitCode = 1;
  });
}

module.exports = { syncGamingInfoCacheSafely };
