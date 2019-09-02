'use strict'

const AWS = require('aws-sdk')

const ami = require('./ami')
const config = require('../config')
const logger = require('../logger')

const s3Param = Object.freeze({
  Bucket: config.get('cache:s3:bucket'),
  Key: `${config.get('cache:s3:prefix')}/ami.json`,
})

const s3 = new AWS.S3()

async function s3Upload (payload) {
  const func = 's3Upload'

  logger.info({ func, event: 'uploading' })

  const putOptions = Object.assign({ Body: JSON.stringify(payload) }, s3Param)
  const response = await s3.putObject(putOptions).promise()

  logger.info({ func, event: 'uploaded' })
  return response
}

async function update (evt, ctx) {
  const images = await ami()
  await s3Upload(images)
  return images
}

async function download (evt, ctx) {
  const response = await s3.getObject(s3Param).promise()
  return {
    statusCode: 200,
    body: response.Body.toString(),
  }
}

module.exports = {
  download,
  update,
}
