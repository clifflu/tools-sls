'use strict'

const AWS = require('aws-sdk')

const config = require('../config')
const logger = require('../logger')

const _cache = {}

AWS.config.update({ region: process.env.AWS_REGION || 'us-west-2' })

async function findRegions () {
  if (config.get('REGIONS')) {
    return config.get('REGIONS').split(',').map(s => s.trim())
  }

  const ec2 = new AWS.EC2()
  const response = await ec2.describeRegions().promise()
  const regions = response.Regions.map(d => d.RegionName)

  logger.info({ func: 'findRegions', regions })
  return regions
}

function pickImageWinner (images, options) {
  const func = 'pickImageWinner'
  const filterRc = /[^\w]rc[^\w]/

  let winner
  let winnerTimestamp = 0

  images.map(image => {
    const ts = Date.parse(image.CreationDate)

    if (ts <= winnerTimestamp) {
      logger.info({ func, event: 'drop old image', image: image.Name })
      return
    }

    if (image.Name.match(filterRc)) {
      logger.info({ func, event: 'skip RC image', image: image.Name })
      return
    }

    logger.info({ func, event: 'new winner', image: image.Name })

    winner = image
    winnerTimestamp = ts
  })

  return Object.assign(winner, { _Region: options.region, _Family: options.family })
}

async function harvestHvmRegionNameWinner (ec2Region, options) {
  const requestOptions = {
    Owners: ['amazon'],
    Filters: [
      { Name: 'name', Values: [options.nf] },
      { Name: 'virtualization-type', Values: ['hvm'] },
      { Name: 'root-device-type', Values: ['ebs'] },
      { Name: 'architecture', Values: ['x86_64'] },
    ],
  }

  const response = await ec2Region.describeImages(requestOptions).promise()
  const winner = pickImageWinner(response.Images, options)

  return winner
}

async function harvestRegion (region) {
  const ec2Region = new AWS.EC2({ region })
  const func = 'harvestRegion'

  logger.info({ func, event: 'reading from region', region })

  const nameFilters = [
    { region, family: 'EcsHvm64', nf: 'amzn-ami-*-amazon-ecs-optimized' },
    { region, family: 'Ec2Hvm64', nf: 'amzn-ami-*-gp2' },
    { region, family: 'NatHvm64', nf: 'amzn-ami-vpc-nat-*' },
  ]

  const promises = nameFilters.map(
    options => harvestHvmRegionNameWinner(ec2Region, options)
  )

  const result = await Promise.all(promises)
  logger.info({ func, event: 'completed region', region })

  return result
}

function formatImages (results) {
  const output = {}
  results.map(r => {
    output[r._Region] = output[r._Region] || {}
    output[r._Region][r._Family] = r.ImageId
  })

  return output
}

async function updateCache (output) {
  _cache.Ami = output
  return output
}

async function collectAmi () {
  if (_cache.Ami) {
    return Promise.resolve(_cache.Ami)
  }

  const regions = await findRegions()
  const promises = regions.map(harvestRegion)
  const results = await Promise.all(promises)
  const images = results.reduce((a, b) => a.concat(b)) // flatten List
  const output = formatImages(images)

  await updateCache(output)
  return output
}

module.exports = collectAmi
