'use strict';

const hubSpotClient = require('../clients/hubSpotClient');
const { chunk } = require('../utils/chunk');
const { validateDealPayload } = require('../utils/validateHubSpotPayload');

const DEALS_PATH = '/crm/v3/objects/deals';
const DEFAULT_PROPERTIES = ['dealname', 'amount', 'pipeline', 'dealstage'];
const MAX_BATCH_SIZE = 100;

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

async function getDealPipelines() {
  const { data } = await hubSpotClient.get('/crm/v3/pipelines/deals');
  return data.results.map((pipeline) => ({
    id: pipeline.id,
    label: pipeline.label,
    stages: pipeline.stages.map((stage) => ({ id: stage.id, label: stage.label })),
  }));
}

async function createHubSpotDeal(properties) {
  validateDealPayload(properties);
  const { data } = await hubSpotClient.post(DEALS_PATH, { properties });
  return mapDeal(data);
}

async function updateHubSpotDeal(dealId, properties) {
  validateDealPayload(properties, { partial: true });
  const { data } = await hubSpotClient.patch(`${DEALS_PATH}/${dealId}`, { properties });
  return mapDeal(data);
}

async function deleteHubSpotDeal(dealId) {
  await hubSpotClient.delete(`${DEALS_PATH}/${dealId}`);
  return true;
}

// Native atomic upsert-by-property, same mechanism as contactRepository.batchUpsertContactsByEmail.
// Deals have no unique property by default (dealname is NOT unique; batch/upsert
// rejects it live with a 400), so this relies on a custom property created for this
// purpose: `sync_external_id`, marked "unique value" in the portal (Settings >
// Properties > Deals > sync_external_id > hasUniqueValue: true, verified via
// GET /crm/v3/properties/deals/sync_external_id). Populated with each record's `source_id`
// as the natural key. Docs: https://developers.hubspot.com/docs/api/crm/properties#create-unique-identifier-properties
// HubSpot rejects the whole request if any input is invalid, so results are reported per chunk.
async function batchUpsertDealsByExternalId(propertiesList) {
  const outcomes = [];

  for (const batch of chunk(propertiesList, MAX_BATCH_SIZE)) {
    const ids = batch.map((properties) => properties.sync_external_id);

    try {
      batch.forEach((properties) => validateDealPayload(properties));

      const { data } = await hubSpotClient.post(`${DEALS_PATH}/batch/upsert`, {
        inputs: batch.map((properties) => ({
          id: properties.sync_external_id,
          idProperty: 'sync_external_id',
          properties,
        })),
      });

      const records = data.results.map((result) => ({
        id: result.id,
        sync_external_id: result.properties.sync_external_id,
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
  getHubSpotDeals,
  getDealPipelines,
  createHubSpotDeal,
  updateHubSpotDeal,
  deleteHubSpotDeal,
  batchUpsertDealsByExternalId,
};
