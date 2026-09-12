'use strict';

const { deleteHubSpotContact } = require('../repositories/contactRepository');

async function run() {
  const [contactId] = process.argv.slice(2);

  if (!contactId) {
    console.error('Usage: node src/examples/delete-contact.js <contactId>');
    process.exitCode = 1;
    return;
  }

  try {
    await deleteHubSpotContact(contactId);
    console.log(`Contact ${contactId} deleted.`);
  } catch (error) {
    console.error('Failed to delete contact:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
