// eslint-disable-next-line
const client = require('ganache-cli');
const CoverageAPI = require('solidity-coverage/api');

async function run() {
  const api = new CoverageAPI({ client });
  await api.instrument();
  const address = await api.ganache();
  console.log('address', address);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 100000);
  });
}

run()
  .then(() => {
    console.log('Finished running coverage');
    process.exit(0);
  })
  .catch(e => {
    console.error('Coverage failed due to error:', e);
    process.exit(-1);
  });
