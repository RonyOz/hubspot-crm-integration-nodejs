'use strict';

const path = require('node:path');
const contacts = require(path.join('..', '..', 'data', 'contacts.json'));
const { syncContactsWithHubSpot } = require('../services/hubSpotService');

async function run() {
  try {
    const summary = await syncContactsWithHubSpot(contacts);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.failed > 0 || summary.skipped > 0) {
      console.warn(`${summary.failed} record(s) failed and ${summary.skipped} skipped, see "batches" and "skippedRecords" above.`);
    }
  } catch (error) {
    console.error('Failed to run contact sync:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
