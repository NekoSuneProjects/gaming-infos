'use strict';

const { syncApiCache } = require('./sync-api-cache');
const { syncGameCodeCache } = require('./sync-game-code-cache');

async function main() {
  const gamingInfos = await syncApiCache();
  const gameCodes = await syncGameCodeCache();
  console.log(JSON.stringify({ success: true, gamingInfos, gameCodes }, null, 2));
}

main().catch((error) => {
  console.error(`[gaming-infos combined cache] ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
