'use strict'

const ami = require('./lib/ami/handler')

module.exports = {
  ami: ami.download,
  amiUpdate: ami.update,
  hello: require('./lib/hello/handler'),
  ip: require('./lib/ip/handler'),
  gasmon: require('./lib/gasmon/handler'),
}
