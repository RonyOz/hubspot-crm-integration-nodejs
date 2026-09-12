'use strict';

const { Readable, Transform } = require('node:stream');

function createUppercaseTransform() {
  return new Transform({
    transform(chunk, _encoding, callback) {
      callback(null, chunk.toString().toUpperCase());
    },
  });
}

function runUppercaseStreamDemo(text) {
  const source = Readable.from(text);
  const uppercase = createUppercaseTransform();
  return source.pipe(uppercase).pipe(process.stdout);
}

if (require.main === module) {
  runUppercaseStreamDemo('hello streams, this text will be uppercased\n');
}

module.exports = { createUppercaseTransform, runUppercaseStreamDemo };
