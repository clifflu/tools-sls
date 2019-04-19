'use strict'

const AWS = require('aws-sdk')
const extend = require('extend')

const ami = require('./ami')
const config = require('../util/config')

const prepareLogger = require('../util/log').prepareLogger

const s3Param = Object.freeze({
  Bucket: config.get('cache:bucket'),
  Key: `${config.get('cache:prefix')}/ami.json`
})

const s3 = new AWS.S3()

function s3Upload (payload) {
  const log = prepareLogger('s3Upload')
  log('uploading to s3', 1)

  return new Promise((resolve, reject) => {
    s3.putObject(
      extend({ Body: JSON.stringify(payload) }, s3Param),
      (err, data) => err ? reject(err) : resolve(payload)
    )
  }).then(r => log('uploaded to s3', 1) || r)
}

function update (evt, ctx, cb) {
  ami()
    .then(s3Upload)
    .then(r => cb(null, r))
    .catch(cb)
}

function download (evt, ctx, cb) {
  s3.getObject(s3Param,
    (err, data) => err ? cb(err) : cb(null, {
      statusCode: 200,
      body: data.Body.toString()
    })
  )
}

module.exports = {
  download,
  update
}
