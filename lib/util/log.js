const extend = require('extend')

const conf = require('./config')

const _options = {
  defaultLevel: 5
}

function getConfig () {
  return _options
}

function updateConfig (options) {
  extend(_options, options)
}

function log (payload, level) {
  level = level === undefined // in case someone uses 0 as a valid level
    ? _options.defaultLevel
    : level

  if (level >= conf.get('LOG_LEVEL')) {
    // console.log(extend({}, payload, {level}))
    console.log(`[${level}:${payload.loc}] ${payload.msg}`)
  }
}

function prepareLogger (loc) {
  return (msg, level) => log({ loc, msg }, level)
}

module.exports = {
  log,
  updateConfig,
  prepareLogger,
  getConfig
}
