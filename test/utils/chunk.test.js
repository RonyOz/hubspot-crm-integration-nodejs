'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { chunk } = require('../../src/utils/chunk');

test('chunk splits an array into groups of the given size', () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
});

test('chunk puts the remainder in a smaller last group', () => {
  const groups = chunk(Array.from({ length: 101 }, (_, i) => i), 100);
  assert.deepEqual(groups.map((group) => group.length), [100, 1]);
});

test('chunk returns no groups for an empty array', () => {
  assert.deepEqual(chunk([], 100), []);
});
