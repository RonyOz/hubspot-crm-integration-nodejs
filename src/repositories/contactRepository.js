'use strict';

const hubSpotClient = require('../clients/hubSpotClient');
const { validateContactPayload } = require('../utils/validateHubSpotPayload');

const CONTACTS_PATH = '/crm/v3/objects/contacts';
const DEFAULT_PROPERTIES = ['firstname', 'lastname', 'email'];

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

async function findContactByEmail(email) {
  const { data } = await hubSpotClient.post(`${CONTACTS_PATH}/search`, {
    filterGroups: [
      {
        filters: [{ propertyName: 'email', operator: 'EQ', value: email }],
      },
    ],
    properties: DEFAULT_PROPERTIES,
    limit: 1,
  });

  return data.results.length > 0 ? mapContact(data.results[0]) : null;
}

module.exports = {
  getHubSpotContacts,
  getHubSpotContactNames,
  createHubSpotContact,
  updateHubSpotContact,
  deleteHubSpotContact,
  findContactByEmail,
};
