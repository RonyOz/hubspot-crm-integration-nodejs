'use strict';

const { sumArray } = require('./utils_module');

const numbers = [1, 2, 3, 4, 5];
console.log(`Sum of [${numbers.join(', ')}] = ${sumArray(numbers)}`);
