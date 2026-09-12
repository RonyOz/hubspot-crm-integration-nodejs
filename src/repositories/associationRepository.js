'use strict';

const hubSpotClient = require('../clients/hubSpotClient');

// HubSpot's "default association" endpoint (unlabeled) is idempotent by design:
// calling it again for the same pair does not create a duplicate association.
// Docs: https://developers.hubspot.com/docs/api/crm/associations
const ASSOCIATIONS_API_VERSION = '2026-09';

async function associateContactToDeal(contactId, dealId) {
  const path = `/crm/objects/${ASSOCIATIONS_API_VERSION}/contact/${contactId}/associations/default/deal/${dealId}`;
  const { data } = await hubSpotClient.put(path);
  return data;
}

module.exports = {
  associateContactToDeal,
};
