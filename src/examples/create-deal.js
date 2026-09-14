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
    if (error.response && error.response.status === 409) {
      console.error(
        'A deal with this name may already exist — try update-deal.js, or use sync-deals.js for idempotent upserts.'
      );
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
