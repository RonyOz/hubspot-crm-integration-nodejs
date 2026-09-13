'use strict';

const hubSpotClient = require('../clients/hubSpotClient');
const { validateDealPayload, ValidationError } = require('../utils/validateHubSpotPayload');

const DEALS_PATH = '/crm/v3/objects/deals';
const DEFAULT_PROPERTIES = ['dealname', 'amount', 'pipeline', 'dealstage'];

function mapDeal(raw) {
  return {
    id: raw.id,
    ...raw.properties,
  };
}

async function getHubSpotDeals({ limit = 10, after, properties = DEFAULT_PROPERTIES } = {}) {
  const { data } = await hubSpotClient.get(DEALS_PATH, {
    params: {
      limit,
      after,
      properties: properties.join(','),
    },
  });

  return {
    results: data.results.map(mapDeal),
    nextAfter: data.paging?.next?.after || null,
  };
}

async function createHubSpotDeal(properties) {
  validateDealPayload(properties);
  const { data } = await hubSpotClient.post(DEALS_PATH, { properties });
  return mapDeal(data);
}

async function updateHubSpotDeal(dealId, properties) {
  validateDealPayload(properties);
  const { data } = await hubSpotClient.patch(`${DEALS_PATH}/${dealId}`, { properties });
  return mapDeal(data);
}

async function deleteHubSpotDeal(dealId) {
  await hubSpotClient.delete(`${DEALS_PATH}/${dealId}`);
  return true;
}

// Native atomic upsert-by-property, same mechanism as contactRepository.upsertContactByEmail.
// Deals have no unique property by default (dealname is NOT unique — batch/upsert
// rejects it live with a 400), so this relies on a custom property created for this
// purpose: `sync_external_id`, marked "unique value" in the portal (Settings >
// Properties > Deals > sync_external_id > hasUniqueValue: true, verified via
// GET /crm/v3/properties/deals/sync_external_id). Populated with `dealname` as the
// natural key. Docs: https://developers.hubspot.com/docs/api/crm/properties#create-unique-identifier-properties
async function upsertDealByExternalId(properties) {
  if (!properties || !properties.sync_external_id) {
    throw new ValidationError('sync_external_id is required to upsert a deal', ['properties.sync_external_id is required']);
  }
  validateDealPayload(properties);

  const { data } = await hubSpotClient.post(`${DEALS_PATH}/batch/upsert`, {
    inputs: [{ id: properties.sync_external_id, idProperty: 'sync_external_id', properties }],
  });

  const result = data.results[0];
  return { ...mapDeal(result), isNew: result.new };
}

module.exports = {
  getHubSpotDeals,
  createHubSpotDeal,
  updateHubSpotDeal,
  deleteHubSpotDeal,
  upsertDealByExternalId,
};
