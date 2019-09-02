const gasmon = require('./gasmon')
const fetcher = require('./fetcher')

async function handler (evt, ctx) {
  const payload = await fetcher.fetchPricing()
  await gasmon.updateStore(payload)
  gasmon.composeMessage(payload)
  await gasmon.notify(payload)
}

module.exports = handler
