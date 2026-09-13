'use strict';

// Pure branching-logic tests. These never touch hubSpotClient, axios, or the
// network, they only exercise classifyHubSpotError/computeBackoffDelayMs on
// plain objects, so this does not violate the "no mocking HubSpot calls" rule.

const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyHubSpotError, computeBackoffDelayMs } = require('../../src/utils/handleHubSpotErrors');

test('computeBackoffDelayMs: Retry-After header overrides computed delay', () => {
  assert.equal(computeBackoffDelayMs(1, 500, 5000), 5000);
});

test('computeBackoffDelayMs: attempt 1 falls in [500, 1000)', () => {
  const delay = computeBackoffDelayMs(1, 500, null);
  assert.ok(delay >= 500 && delay < 1000, `expected [500,1000), got ${delay}`);
});

test('computeBackoffDelayMs: attempt 3 falls in [2000, 2500)', () => {
  const delay = computeBackoffDelayMs(3, 500, null);
  assert.ok(delay >= 2000 && delay < 2500, `expected [2000,2500), got ${delay}`);
});

test('computeBackoffDelayMs: grows exponentially (non-overlapping ranges)', () => {
  const low = computeBackoffDelayMs(1, 500, null);
  const high = computeBackoffDelayMs(5, 500, null);
  assert.ok(low < 1000, `attempt 1 should be < 1000, got ${low}`);
  assert.ok(high >= 8000, `attempt 5 should be >= 8000, got ${high}`);
});

test('classifyHubSpotError: network error without response is retryable', () => {
  const result = classifyHubSpotError({ message: 'Network Error', code: 'ECONNABORTED' });
  assert.equal(result.isRetryable, true);
  assert.equal(result.status, null);
});

test('classifyHubSpotError: 429 is retryable and parses Retry-After', () => {
  const result = classifyHubSpotError({
    response: { status: 429, headers: { 'retry-after': '2' }, data: {} },
  });
  assert.equal(result.isRetryable, true);
  assert.equal(result.retryAfterMs, 2000);
});

test('classifyHubSpotError: 401 is not retryable', () => {
  const result = classifyHubSpotError({
    response: { status: 401, headers: {}, data: { message: 'Invalid token' } },
  });
  assert.equal(result.isRetryable, false);
  assert.equal(result.message, 'Invalid token');
});

test('classifyHubSpotError: 400 is not retryable', () => {
  const result = classifyHubSpotError({ response: { status: 400, headers: {}, data: {} } });
  assert.equal(result.isRetryable, false);
});
