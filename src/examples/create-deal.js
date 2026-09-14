'use strict';

const { createHubSpotDeal } = require('../services/hubSpotService');

async function run() {
  try {
    const [dealnameArg, amountArg] = process.argv.slice(2);
    const properties = {
      dealname: dealnameArg || `Demo Deal ${Date.now()}`,
      amount: amountArg || '1000',
    };

    const deal = await createHubSpotDeal(properties);
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
