'use strict';

const { createHubSpotContact } = require('../services/hubSpotService');

async function run() {
  try {
    const [firstname, lastname, email] = process.argv.slice(2);
    const properties = firstname
      ? { firstname, lastname, email }
      : {
          firstname: 'Demo',
          lastname: 'Contact',
          email: `demo.contact.${Date.now()}@example.com`,
        };

    const contact = await createHubSpotContact(properties);
    console.log('Contact created:', contact);
  } catch (error) {
    console.error('Failed to create contact:', error.message);
    if (error.response && error.response.status === 409) {
      console.error(
        'A contact with this email may already exist, try update-contact.js, or use sync-contacts.js for idempotent upserts.'
      );
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
