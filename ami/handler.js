'use strict'

const ami = require('./ami')

function handler (evt, ctx, cb) {
  ami()
    .then(r => cb(null, {
      statusCode: 200,
      body: JSON.stringify(r),
    }))
    .catch(cb)
}

module.exports = handler
