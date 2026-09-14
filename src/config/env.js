'use strict';

require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  hubspot: {
    baseUrl: 'https://api.hubapi.com',
    accessToken: requireEnv('HUBSPOT_ACCESS_TOKEN'),
    portalId: process.env.HUBSPOT_PORTAL_ID || null,
    pipelineId: process.env.HUBSPOT_PIPELINE_ID || 'default',
    stageId: process.env.HUBSPOT_STAGE_ID || 'appointmentscheduled',
    maxRetries: Number(process.env.HUBSPOT_MAX_RETRIES || 3),
    retryBaseDelayMs: Number(process.env.HUBSPOT_RETRY_BASE_DELAY_MS || 500),
  },
};

module.exports = config;
