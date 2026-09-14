'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ValidationError,
  validateContactPayload,
  validateDealPayload,
  validateHubSpotPayload,
} = require('../../src/utils/validateHubSpotPayload');

test('validateContactPayload accepts firstname+lastname', () => {
  assert.equal(validateContactPayload({ firstname: 'Rony', lastname: 'Ozuna' }), true);
});

test('validateContactPayload accepts email alone', () => {
  assert.equal(validateContactPayload({ email: 'a@b.com' }), true);
});

test('validateContactPayload rejects invalid email', () => {
  assert.throws(() => validateContactPayload({ email: 'not-an-email' }), { name: 'ValidationError' });
});

test('validateContactPayload rejects non-string firstname', () => {
  assert.throws(() => validateContactPayload({ firstname: 123 }), ValidationError);
});

test('validateContactPayload rejects empty payload', () => {
  assert.throws(() => validateContactPayload({}), ValidationError);
});

test('validateContactPayload rejects null', () => {
  assert.throws(() => validateContactPayload(null), ValidationError);
});

test('validateDealPayload accepts full valid payload', () => {
  assert.equal(
    validateDealPayload({ dealname: 'X', amount: 100, pipeline: 'default', dealstage: 'appointmentscheduled' }),
    true
  );
});

test('validateDealPayload rejects missing dealname', () => {
  assert.throws(() => validateDealPayload({}), ValidationError);
});

test('validateDealPayload accepts a partial update without dealname', () => {
  assert.equal(validateDealPayload({ amount: '750' }, { partial: true }), true);
});

test('validateDealPayload still type-checks dealname on a partial update', () => {
  assert.throws(() => validateDealPayload({ dealname: 42 }, { partial: true }), ValidationError);
});

test('validateDealPayload rejects non-numeric amount', () => {
  assert.throws(() => validateDealPayload({ dealname: 'X', amount: 'abc' }), ValidationError);
});

test('validateDealPayload accepts numeric string amount', () => {
  assert.equal(validateDealPayload({ dealname: 'X', amount: '500' }), true);
});

test('validateDealPayload rejects non-string pipeline', () => {
  assert.throws(() => validateDealPayload({ dealname: 'X', pipeline: 42 }), ValidationError);
});

test('validateHubSpotPayload dispatches by object type', () => {
  assert.equal(validateHubSpotPayload('contact', { email: 'a@b.com' }), true);
  assert.equal(validateHubSpotPayload('deal', { dealname: 'X' }), true);
  assert.throws(() => validateHubSpotPayload('widget', {}), ValidationError);
});
