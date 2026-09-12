'use strict';

const { associateContactToDeal } = require('../services/hubSpotService');

async function run() {
  const [contactId, dealId] = process.argv.slice(2);

  if (!contactId || !dealId) {
    console.error('Usage: node src/examples/associate-contact-deal.js <contactId> <dealId>');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await associateContactToDeal(contactId, dealId);
    console.log('Association created:', result);
    console.log('This endpoint is idempotent — running this command again is safe and will not create a duplicate association.');
  } catch (error) {
    console.error('Failed to associate contact and deal:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
