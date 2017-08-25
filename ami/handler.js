'use strict'

const ami = require('./ami')

function handler (evt, ctx, cb) {
  ami()
    .then(r => cb(null, r))
    .catch(cb)
}

module.exports = handler
