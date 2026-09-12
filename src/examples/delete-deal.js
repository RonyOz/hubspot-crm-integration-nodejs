'use strict';

const { deleteHubSpotDeal } = require('../repositories/dealRepository');

async function run() {
  const [dealId] = process.argv.slice(2);

  if (!dealId) {
    console.error('Usage: node src/examples/delete-deal.js <dealId>');
    process.exitCode = 1;
    return;
  }

  try {
    await deleteHubSpotDeal(dealId);
    console.log(`Deal ${dealId} deleted.`);
  } catch (error) {
    console.error('Failed to delete deal:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
