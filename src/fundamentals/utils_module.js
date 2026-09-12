'use strict';

function sumArray(numbers) {
  if (!Array.isArray(numbers)) {
    throw new TypeError('numbers must be an array');
  }
  return numbers.reduce((total, n) => total + n, 0);
}

module.exports = { sumArray };
