'use strict';

const config = require('../config/env');
const contactRepository = require('../repositories/contactRepository');
const dealRepository = require('../repositories/dealRepository');
const { associateContactToDeal } = require('../repositories/associationRepository');
const { logHubSpotError, classifyHubSpotError } = require('../utils/handleHubSpotErrors');
const { ValidationError } = require('../utils/validateHubSpotPayload');

function describeError(error) {
  if (error instanceof ValidationError) {
    return { message: error.message, details: error.details };
  }
  const classified = classifyHubSpotError(error);
  return { message: classified.message, status: classified.status, code: classified.code };
}

function summarize(results) {
  return {
    total: results.length,
    created: results.filter((r) => r.status === 'created').length,
    updated: results.filter((r) => r.status === 'updated').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };
}

async function syncContactsWithHubSpot(contacts) {
  if (!Array.isArray(contacts)) {
    throw new TypeError('contacts must be an array');
  }

  const results = [];

  for (const [index, input] of contacts.entries()) {
    const identifier = (input && input.email) || `#${index}`;

    if (!input || !input.email) {
      results.push({
        identifier,
        input,
        status: 'failed',
        id: null,
        error: { message: 'email is required to sync a contact idempotently' },
      });
      continue;
    }

    const properties = {
      email: input.email,
      ...(input.firstname !== undefined ? { firstname: input.firstname } : {}),
      ...(input.lastname !== undefined ? { lastname: input.lastname } : {}),
    };

    try {
      // Native atomic upsert-by-email no client-side search, so no eventual-consistency race like the one
      // found for deals below.
      const result = await contactRepository.upsertContactByEmail(properties);

      results.push({
        identifier,
        input,
        status: result.isNew ? 'created' : 'updated',
        id: result.id,
        error: null,
      });
    } catch (error) {
      logHubSpotError(error, { operation: 'syncContactsWithHubSpot', identifier });
      results.push({ identifier, input, status: 'failed', id: null, error: describeError(error) });
    }
  }

  return summarize(results);
}

async function syncDealsWithHubSpot(deals) {
  if (!Array.isArray(deals)) {
    throw new TypeError('deals must be an array');
  }

  const results = [];

  for (const [index, input] of deals.entries()) {
    const identifier = (input && input.dealname) || `#${index}`;

    if (!input || !input.dealname) {
      results.push({
        identifier,
        input,
        status: 'failed',
        id: null,
        error: { message: 'dealname is required to sync a deal idempotently' },
      });
      continue;
    }

    const properties = {
      dealname: input.dealname,
      amount: input.amount,
      pipeline: input.pipeline || config.hubspot.pipelineId,
      dealstage: input.dealstage || config.hubspot.stageId,
    };

    try {
      // Deals have no default unique property (unlike contacts' email), so
      // HubSpot's batch/upsert endpoint rejects `idProperty: 'dealname'` with
      // a 400 (confirmed live: "Unable to perform update/upsert by non-unique
      // 0-3 property dealname"). Falls back to client-side search-then-write,
      // which carries the Search API's eventual-consistency risk documented
      // in the README's Known Limitations section.
      const existing = await dealRepository.findDealByName(input.dealname);
      const result = existing
        ? await dealRepository.updateHubSpotDeal(existing.id, properties)
        : await dealRepository.createHubSpotDeal(properties);

      results.push({
        identifier,
        input,
        status: existing ? 'updated' : 'created',
        id: result.id,
        error: null,
      });
    } catch (error) {
      logHubSpotError(error, { operation: 'syncDealsWithHubSpot', identifier });
      results.push({ identifier, input, status: 'failed', id: null, error: describeError(error) });
    }
  }

  return summarize(results);
}

module.exports = {
  // Thin delegations: no extra logic here, but every example/controller talks
  // to the service, never the repository directly — keeps a single, uniform
  // entry point so cross-cutting concerns (audit, cache, etc.) have one place
  // to land later, and no caller has to guess which layer to call.
  getHubSpotContacts: contactRepository.getHubSpotContacts,
  getHubSpotContactNames: contactRepository.getHubSpotContactNames,
  createHubSpotContact: contactRepository.createHubSpotContact,
  updateHubSpotContact: contactRepository.updateHubSpotContact,
  deleteHubSpotContact: contactRepository.deleteHubSpotContact,

  getHubSpotDeals: dealRepository.getHubSpotDeals,
  createHubSpotDeal: dealRepository.createHubSpotDeal,
  updateHubSpotDeal: dealRepository.updateHubSpotDeal,
  deleteHubSpotDeal: dealRepository.deleteHubSpotDeal,

  // Orchestration (real logic lives here)
  syncContactsWithHubSpot,
  syncDealsWithHubSpot,
  associateContactToDeal,
};
