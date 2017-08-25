'use strict'

const ami = require('./ami/handler')

module.exports = {
  ami: ami.download,
  amiUpdate: ami.update,
  hello: require('./hello/handler'),
  ip: require('./ip/handler')
}
