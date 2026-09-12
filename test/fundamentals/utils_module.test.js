'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { sumArray } = require('../../src/fundamentals/utils_module');

test('sumArray sums positive numbers', () => {
  assert.equal(sumArray([1, 2, 3, 4, 5]), 15);
});

test('sumArray returns 0 for empty array', () => {
  assert.equal(sumArray([]), 0);
});

test('sumArray handles negative numbers', () => {
  assert.equal(sumArray([-5, 5]), 0);
});

test('sumArray throws TypeError for non-array input', () => {
  assert.throws(() => sumArray('abc'), TypeError);
});
