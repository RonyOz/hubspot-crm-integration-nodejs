'use strict';

const axios = require('axios');
const config = require('../config/env');
const { logHubSpotError, computeBackoffDelayMs } = require('../utils/handleHubSpotErrors');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const hubSpotClient = axios.create({
  baseURL: config.hubspot.baseUrl,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${config.hubspot.accessToken}`,
    'Content-Type': 'application/json',
  },
});

hubSpotClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestConfig = error.config;
    if (!requestConfig) {
      throw error;
    }

    requestConfig._retryCount = requestConfig._retryCount || 0;

    const classified = logHubSpotError(error, {
      attempt: requestConfig._retryCount + 1,
    });

    const canRetry = classified.isRetryable && requestConfig._retryCount < config.hubspot.maxRetries;

    if (!canRetry) {
      return Promise.reject(error);
    }

    requestConfig._retryCount += 1;
    const delayMs = computeBackoffDelayMs(
      requestConfig._retryCount,
      config.hubspot.retryBaseDelayMs,
      classified.retryAfterMs
    );

    await sleep(delayMs);
    return hubSpotClient(requestConfig);
  }
);

module.exports = hubSpotClient;
