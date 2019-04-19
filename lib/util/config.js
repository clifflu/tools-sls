const path = require('path')
const nconf = require('nconf')

nconf
  .argv()
  .env(['REGIONS', 'LOG_LEVEL'])
  .defaults({
    LOG_LEVEL: 5
  })

nconf.file({
  file: path.join(__dirname, '../..', 'config/main.yml'),
  format: require('nconf-yaml')
})

module.exports = nconf
