'use strict';

function fetchDataAsPromise(delayMs) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (delayMs < 0) {
        reject(new Error('delayMs must be >= 0'));
        return;
      }
      resolve({ message: 'data fetched', delayMs });
    }, delayMs);
  });
}

async function main() {
  try {
    const result = await fetchDataAsPromise(300);
    console.log('async/await result:', result);
  } catch (err) {
    console.error('async/await error:', err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fetchDataAsPromise };
