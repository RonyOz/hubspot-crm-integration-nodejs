'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createUppercaseTransform } = require('../../src/utils/streams');

function collect(transform, chunks) {
  return new Promise((resolve, reject) => {
    let output = '';
    transform.on('data', (chunk) => {
      output += chunk.toString();
    });
    transform.on('end', () => resolve(output));
    transform.on('error', reject);

    chunks.forEach((chunk) => transform.write(chunk));
    transform.end();
  });
}

test('createUppercaseTransform uppercases a single chunk', async () => {
  const result = await collect(createUppercaseTransform(), ['hello streams']);
  assert.equal(result, 'HELLO STREAMS');
});

test('createUppercaseTransform uppercases multiple chunks', async () => {
  const result = await collect(createUppercaseTransform(), ['foo', 'bar']);
  assert.equal(result, 'FOOBAR');
});

test('createUppercaseTransform handles empty input', async () => {
  const result = await collect(createUppercaseTransform(), ['']);
  assert.equal(result, '');
});
