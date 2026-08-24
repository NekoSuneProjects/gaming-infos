'use strict';

const { syncGamingInfoCacheSafely } = require('./sync-gaming-info-cache');
const { syncGameCodeCache } = require('./sync-game-code-cache');

async function main() {
  // The gaming-info phase temporarily moves data/game-codes out of the way,
  // mirrors data/, then restores the previous code cache before code syncing.
  // If the code API fails afterwards, its last-good fallback is still present.
  const gamingInfos = await syncGamingInfoCacheSafely();
  const gameCodes = await syncGameCodeCache();
  console.log(JSON.stringify({ success: true, gamingInfos, gameCodes }, null, 2));
}

main().catch((error) => {
  console.error(`[gaming-infos combined cache] ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
