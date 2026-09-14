'use strict';

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactPayload(properties = {}) {
  const errors = [];

  if (typeof properties !== 'object' || properties === null) {
    throw new ValidationError('Contact properties must be an object', ['properties is not an object']);
  }

  if (properties.email !== undefined && !EMAIL_REGEX.test(properties.email)) {
    errors.push(`Invalid email: "${properties.email}"`);
  }

  if (properties.firstname !== undefined && typeof properties.firstname !== 'string') {
    errors.push('firstname must be a string');
  }

  if (properties.lastname !== undefined && typeof properties.lastname !== 'string') {
    errors.push('lastname must be a string');
  }

  if (!properties.email && !properties.firstname && !properties.lastname) {
    errors.push('At least one of email, firstname or lastname is required');
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid contact payload', errors);
  }

  return true;
}

function validateDealPayload(properties = {}, { partial = false } = {}) {
  const errors = [];

  if (typeof properties !== 'object' || properties === null) {
    throw new ValidationError('Deal properties must be an object', ['properties is not an object']);
  }

  const dealnameRequired = !partial || properties.dealname !== undefined;
  if (dealnameRequired && (!properties.dealname || typeof properties.dealname !== 'string')) {
    errors.push('dealname is required and must be a string');
  }

  if (properties.amount !== undefined && Number.isNaN(Number(properties.amount))) {
    errors.push(`amount must be numeric, got "${properties.amount}"`);
  }

  if (properties.pipeline !== undefined && typeof properties.pipeline !== 'string') {
    errors.push('pipeline must be a string');
  }

  if (properties.dealstage !== undefined && typeof properties.dealstage !== 'string') {
    errors.push('dealstage must be a string');
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid deal payload', errors);
  }

  return true;
}

function validateHubSpotPayload(objectType, properties, options) {
  if (objectType === 'contact') return validateContactPayload(properties);
  if (objectType === 'deal') return validateDealPayload(properties, options);
  throw new ValidationError(`Unknown HubSpot object type: "${objectType}"`);
}

module.exports = {
  ValidationError,
  validateContactPayload,
  validateDealPayload,
  validateHubSpotPayload,
};
