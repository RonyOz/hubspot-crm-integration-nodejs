'use strict';

const { getHubSpotDeals } = require('../services/hubSpotService');

async function run() {
  try {
    const [limitArg] = process.argv.slice(2);
    const limit = limitArg ? Number(limitArg) : 10;
    const { results, nextAfter } = await getHubSpotDeals({ limit });
    console.log(`Deals (limit=${limit}):`);
    console.log(JSON.stringify(results, null, 2));
    if (nextAfter) console.log(`More results available, next cursor: ${nextAfter}`);
  } catch (error) {
    console.error('Failed to list deals:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
