const path = require('path')
const nconf = require('nconf')

nconf
  .argv()
  .env(['REGIONS'])
  .defaults({

  })

nconf.file({
  file: path.join(__dirname, '..', 'config/main.yml'),
  format: require('nconf-yaml'),
})

module.exports = nconf
