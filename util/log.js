const extend = require('extend')

const _options = {
  defaultLevel: 5,
  cutoffLevel: 4,
}

if (process.env.LOG_LEVEL !== undefined) {
  _options.cutoffLevel = process.env.LOG_LEVEL
}

function getConfig() {
  return _options
}

function updateConfig(options) {
  extend(_options, options)
}

function log(payload, level) {
  level = level === undefined // in case someone uses 0 as a valid level
    ? _options.defaultLevel
    : level

  if (level >= _options.cutoffLevel) {
    //console.log(extend({}, payload, {level}))
    console.log(`[${level}:${payload.loc}] ${payload.msg}`)
  }
}

function prepareLogger(loc) {
  return (msg, level) => log({loc, msg}, level)
}

module.exports = {
  log,
  updateConfig,
  prepareLogger,
  getConfig,
}
