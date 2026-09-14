'use strict';

const { createHubSpotDeal } = require('../services/hubSpotService');

async function run() {
  try {
    const [dealnameArg, amountArg] = process.argv.slice(2);
    const deal = await createHubSpotDeal(dealnameArg || `Demo Deal ${Date.now()}`, amountArg || '1000');
    console.log('Deal created:', deal);
  } catch (error) {
    console.error('Failed to create deal:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
