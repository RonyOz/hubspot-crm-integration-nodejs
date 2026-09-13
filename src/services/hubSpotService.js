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
    const identifier = (input && input.source_id) || `#${index}`;

    if (!input || !input.source_id) {
      results.push({
        identifier,
        input,
        status: 'failed',
        id: null,
        error: { message: 'source_id is required to sync a deal idempotently' },
      });
      continue;
    }

    const properties = {
      dealname: input.dealname,
      amount: input.amount,
      pipeline: input.pipeline || config.hubspot.pipelineId,
      dealstage: input.dealstage || config.hubspot.stageId,
      // source_id models the natural key a real external system would provide
      // (a record ID from whatever CRM/ERP this sync is migrating from); it's
      // stable even if dealname changes later. Stored in HubSpot's
      // sync_external_id (custom property, marked "unique value"), which is
      // what makes the atomic batch/upsert possible for deals, same mechanism
      // contacts get for free from `email`.
      sync_external_id: input.source_id,
    };

    try {
      const result = await dealRepository.upsertDealByExternalId(properties);

      results.push({
        identifier,
        input,
        status: result.isNew ? 'created' : 'updated',
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
  // to the service, never the repository directly; keeps a single, uniform
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
