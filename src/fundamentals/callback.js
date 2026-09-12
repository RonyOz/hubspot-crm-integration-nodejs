'use strict';

function fetchDataWithCallback(delayMs, callback) {
  setTimeout(() => {
    if (delayMs < 0) {
      callback(new Error('delayMs must be >= 0'));
      return;
    }
    callback(null, { message: 'data fetched', delayMs });
  }, delayMs);
}

function main() {
  fetchDataWithCallback(300, (err, result) => {
    if (err) {
      console.error('callback error:', err.message);
      return;
    }
    console.log('callback result:', result);
  });
}

if (require.main === module) {
  main();
}

module.exports = { fetchDataWithCallback };
