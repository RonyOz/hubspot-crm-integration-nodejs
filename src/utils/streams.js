'use strict';

const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

function createUppercaseTransform() {
  return new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, chunk.toString().toUpperCase());
    },
  });
}

function runUppercaseStreamDemo(text) {
  return pipeline(Readable.from(text), createUppercaseTransform(), process.stdout);
}

if (require.main === module) {
  runUppercaseStreamDemo('hello streams, this text will be uppercased\n').catch((error) => {
    console.error('Stream failed:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { createUppercaseTransform, runUppercaseStreamDemo };
