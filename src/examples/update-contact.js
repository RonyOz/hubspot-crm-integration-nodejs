'use strict';

const { updateHubSpotContact } = require('../repositories/contactRepository');

async function run() {
  const [contactId, firstname, lastname, email] = process.argv.slice(2);

  if (!contactId) {
    console.error('Usage: node src/examples/update-contact.js <contactId> [firstname] [lastname] [email]');
    process.exitCode = 1;
    return;
  }

  try {
    const properties = {};
    if (firstname !== undefined) properties.firstname = firstname;
    if (lastname !== undefined) properties.lastname = lastname;
    if (email !== undefined) properties.email = email;

    const contact = await updateHubSpotContact(contactId, properties);
    console.log('Contact updated:', contact);
  } catch (error) {
    console.error('Failed to update contact:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
