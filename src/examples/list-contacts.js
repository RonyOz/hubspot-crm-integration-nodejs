'use strict';

const { getHubSpotContacts } = require('../repositories/contactRepository');

async function run() {
  try {
    const [limitArg] = process.argv.slice(2);
    const limit = limitArg ? Number(limitArg) : 10;
    const { results, nextAfter } = await getHubSpotContacts({ limit });
    console.log(`Contacts (limit=${limit}):`);
    console.log(JSON.stringify(results, null, 2));
    if (nextAfter) console.log(`More results available, next cursor: ${nextAfter}`);
  } catch (error) {
    console.error('Failed to list contacts:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
