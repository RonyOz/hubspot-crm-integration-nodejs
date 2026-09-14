'use strict';

const config = require('../config/env');
const contactRepository = require('../repositories/contactRepository');
const dealRepository = require('../repositories/dealRepository');
const { associateContactToDeal } = require('../repositories/associationRepository');
const { classifyHubSpotError } = require('../utils/handleHubSpotErrors');
const { ValidationError } = require('../utils/validateHubSpotPayload');

function describeError(error) {
  if (error instanceof ValidationError) {
    return { message: error.message, details: error.details };
  }
  const classified = classifyHubSpotError(error);
  return { message: classified.message, status: classified.status, code: classified.code };
}

function resolveDealPipelineDefaults(properties) {
  return {
    pipeline: properties.pipeline || config.hubspot.pipelineId,
    dealstage: properties.dealstage || config.hubspot.stageId,
  };
}

function createHubSpotDeal(properties = {}) {
  const payload = { ...properties, ...resolveDealPipelineDefaults(properties) };
  return dealRepository.createHubSpotDeal(payload);
}

function toBatchReport(outcome) {
  if (outcome.error) {
    return { status: 'failed', size: outcome.ids.length, ids: outcome.ids, error: describeError(outcome.error) };
  }

  const created = outcome.records.filter((record) => record.isNew).length;
  return {
    status: 'succeeded',
    size: outcome.records.length,
    created,
    updated: outcome.records.length - created,
    records: outcome.records,
  };
}

function summarize(total, batches, skippedRecords) {
  const succeeded = batches.filter((batch) => batch.status === 'succeeded');
  const failed = batches.filter((batch) => batch.status === 'failed');

  return {
    total,
    created: succeeded.reduce((count, batch) => count + batch.created, 0),
    updated: succeeded.reduce((count, batch) => count + batch.updated, 0),
    failed: failed.reduce((count, batch) => count + batch.size, 0),
    skipped: skippedRecords.length,
    batches,
    skippedRecords,
  };
}

async function syncContactsWithHubSpot(contacts) {
  if (!Array.isArray(contacts)) {
    throw new TypeError('contacts must be an array');
  }

  const skippedRecords = [];
  const propertiesList = [];

  contacts.forEach((input, index) => {
    if (!input || !input.email) {
      skippedRecords.push({ index, input, reason: 'email is required to sync a contact idempotently' });
      return;
    }

    propertiesList.push({
      email: input.email,
      ...(input.firstname !== undefined ? { firstname: input.firstname } : {}),
      ...(input.lastname !== undefined ? { lastname: input.lastname } : {}),
    });
  });

  // Native atomic upsert-by-email, no client-side search, so no eventual-consistency race like the one
  // found for deals below.
  const outcomes = await contactRepository.batchUpsertContactsByEmail(propertiesList);
  const batches = outcomes.map((outcome) => toBatchReport(outcome));

  return summarize(contacts.length, batches, skippedRecords);
}

async function syncDealsWithHubSpot(deals) {
  if (!Array.isArray(deals)) {
    throw new TypeError('deals must be an array');
  }

  const skippedRecords = [];
  const propertiesList = [];

  deals.forEach((input, index) => {
    if (!input || !input.source_id) {
      skippedRecords.push({ index, input, reason: 'source_id is required to sync a deal idempotently' });
      return;
    }

    propertiesList.push({
      dealname: input.dealname,
      amount: input.amount,
      ...resolveDealPipelineDefaults(input),
      // source_id models the natural key a real external system would provide
      // (a record ID from whatever CRM/ERP this sync is migrating from); it's
      // stable even if dealname changes later. Stored in HubSpot's
      // sync_external_id (custom property, marked "unique value"), which is
      // what makes the atomic batch/upsert possible for deals, same mechanism
      // contacts get for free from `email`.
      sync_external_id: input.source_id,
    });
  });

  const outcomes = await dealRepository.batchUpsertDealsByExternalId(propertiesList);
  const batches = outcomes.map((outcome) => toBatchReport(outcome));

  return summarize(deals.length, batches, skippedRecords);
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
  updateHubSpotDeal: dealRepository.updateHubSpotDeal,
  deleteHubSpotDeal: dealRepository.deleteHubSpotDeal,
  associateContactToDeal,

  // Orchestration (real logic lives here)
  createHubSpotDeal,
  syncContactsWithHubSpot,
  syncDealsWithHubSpot,
};
