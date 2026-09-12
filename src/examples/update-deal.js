'use strict';

const { updateHubSpotDeal } = require('../services/hubSpotService');

async function run() {
  const [dealId, dealname, amount] = process.argv.slice(2);

  if (!dealId) {
    console.error('Usage: node src/examples/update-deal.js <dealId> [dealname] [amount]');
    process.exitCode = 1;
    return;
  }

  try {
    const properties = {};
    if (dealname !== undefined) properties.dealname = dealname;
    if (amount !== undefined) properties.amount = amount;

    const deal = await updateHubSpotDeal(dealId, properties);
    console.log('Deal updated:', deal);
  } catch (error) {
    console.error('Failed to update deal:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
