'use strict';

const hubSpotClient = require('../clients/hubSpotClient');
const { validateDealPayload } = require('../utils/validateHubSpotPayload');

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

async function findDealByName(dealname) {
  const { data } = await hubSpotClient.post(`${DEALS_PATH}/search`, {
    filterGroups: [
      {
        filters: [{ propertyName: 'dealname', operator: 'EQ', value: dealname }],
      },
    ],
    properties: DEFAULT_PROPERTIES,
    limit: 1,
  });

  return data.results.length > 0 ? mapDeal(data.results[0]) : null;
}

module.exports = {
  getHubSpotDeals,
  createHubSpotDeal,
  updateHubSpotDeal,
  deleteHubSpotDeal,
  findDealByName,
};
