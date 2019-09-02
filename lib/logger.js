/*
 * Usage
 *   const logger = require('./logger')
 *   logger.notice(`checking ${taskName}`, {func: 'runTask', state: 'enter', taskName })
 */

const winston = require('winston')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'tools' },
  transports: [
    new winston.transports.Console(),
  ],
})

module.exports = logger
