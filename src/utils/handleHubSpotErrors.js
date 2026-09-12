'use strict';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND']);

function sanitizeHeaders(headers = {}) {
  const clone = { ...headers };
  if (clone.Authorization) clone.Authorization = '[REDACTED]';
  if (clone.authorization) clone.authorization = '[REDACTED]';
  return clone;
}

function classifyHubSpotError(error) {
  if (!error.response) {
    return {
      status: null,
      code: error.code || 'NETWORK_ERROR',
      message: error.message,
      isRetryable: RETRYABLE_NETWORK_CODES.has(error.code) || error.message === 'Network Error',
      retryAfterMs: null,
    };
  }

  const { status, headers, data } = error.response;
  const retryAfterHeader = headers ? headers['retry-after'] : undefined;
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;

  return {
    status,
    code: (data && data.category) || `HTTP_${status}`,
    message: (data && data.message) || error.message,
    isRetryable: RETRYABLE_STATUS_CODES.has(status),
    retryAfterMs,
  };
}

function logHubSpotError(error, context = {}) {
  const classified = classifyHubSpotError(error);
  const requestInfo = error.config
    ? {
        method: error.config.method,
        url: error.config.url,
        headers: sanitizeHeaders(error.config.headers),
      }
    : undefined;

  console.error('[HubSpot API error]', {
    context,
    status: classified.status,
    code: classified.code,
    message: classified.message,
    request: requestInfo,
  });

  return classified;
}

function computeBackoffDelayMs(attempt, baseDelayMs, retryAfterMs) {
  if (retryAfterMs) return retryAfterMs;
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * baseDelayMs);
  return exponential + jitter;
}

module.exports = {
  classifyHubSpotError,
  logHubSpotError,
  computeBackoffDelayMs,
  RETRYABLE_STATUS_CODES,
};
