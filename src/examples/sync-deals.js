'use strict';

const path = require('node:path');
const deals = require(path.join('..', '..', 'data', 'deals.json'));
const { syncDealsWithHubSpot } = require('../services/hubSpotService');

async function run() {
  try {
    const summary = await syncDealsWithHubSpot(deals);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed > 0) {
      console.warn(`${summary.failed} record(s) failed to sync — see "results" above for details.`);
    }
  } catch (error) {
    console.error('Failed to run deal sync:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
