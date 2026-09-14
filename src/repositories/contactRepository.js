'use strict';

const hubSpotClient = require('../clients/hubSpotClient');
const { chunk } = require('../utils/chunk');
const { validateContactPayload, ValidationError } = require('../utils/validateHubSpotPayload');

const CONTACTS_PATH = '/crm/v3/objects/contacts';
const DEFAULT_PROPERTIES = ['firstname', 'lastname', 'email'];
const MAX_BATCH_SIZE = 100;

function mapContact(raw) {
  return {
    id: raw.id,
    ...raw.properties,
  };
}

async function getHubSpotContacts({ limit = 10, after, properties = DEFAULT_PROPERTIES } = {}) {
  const { data } = await hubSpotClient.get(CONTACTS_PATH, {
    params: {
      limit,
      after,
      properties: properties.join(','),
    },
  });

  return {
    results: data.results.map(mapContact),
    nextAfter: data.paging?.next?.after || null,
  };
}

async function getHubSpotContactNames() {
  const names = [];
  let after;

  do {
    const page = await getHubSpotContacts({ limit: 100, after, properties: ['firstname', 'lastname'] });
    page.results.forEach((contact) => {
      const fullName = [contact.firstname, contact.lastname].filter(Boolean).join(' ').trim();
      if (fullName) names.push(fullName);
    });
    after = page.nextAfter;
  } while (after);

  return names;
}

async function createHubSpotContact(properties) {
  validateContactPayload(properties);
  const { data } = await hubSpotClient.post(CONTACTS_PATH, { properties });
  return mapContact(data);
}

async function updateHubSpotContact(contactId, properties) {
  validateContactPayload(properties);
  const { data } = await hubSpotClient.patch(`${CONTACTS_PATH}/${contactId}`, { properties });
  return mapContact(data);
}

async function deleteHubSpotContact(contactId) {
  await hubSpotClient.delete(`${CONTACTS_PATH}/${contactId}`);
  return true;
}

// HubSpot rejects the whole request if any input is invalid, so results are reported per chunk.
async function batchUpsertContactsByEmail(propertiesList) {
  const outcomes = [];

  for (const batch of chunk(propertiesList, MAX_BATCH_SIZE)) {
    const ids = batch.map((properties) => properties?.email);

    try {
      batch.forEach((properties) => {
        if (!properties || !properties.email) {
          throw new ValidationError('email is required to upsert a contact by email', ['properties.email is required']);
        }
        validateContactPayload(properties);
      });

      const { data } = await hubSpotClient.post(`${CONTACTS_PATH}/batch/upsert`, {
        inputs: batch.map((properties) => ({ id: properties.email, idProperty: 'email', properties })),
      });

      const records = data.results.map((result) => ({
        id: result.id,
        email: result.properties.email,
        isNew: result.new,
      }));
      outcomes.push({ ids, records, error: null });
    } catch (error) {
      outcomes.push({ ids, records: [], error });
    }
  }

  return outcomes;
}

module.exports = {
  getHubSpotContacts,
  getHubSpotContactNames,
  createHubSpotContact,
  updateHubSpotContact,
  deleteHubSpotContact,
  batchUpsertContactsByEmail,
};
