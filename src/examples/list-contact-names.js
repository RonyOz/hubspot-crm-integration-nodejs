'use strict';

const { getHubSpotContactNames } = require('../services/hubSpotService');

async function run() {
  try {
    const names = await getHubSpotContactNames();
    console.log(`Found ${names.length} contact(s):`);
    names.forEach((name) => console.log(`- ${name}`));
  } catch (error) {
    console.error('Failed to list contact names:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
