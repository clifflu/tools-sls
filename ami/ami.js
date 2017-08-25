'use strict'
const AWS = require('aws-sdk')
const extend = require('extend')

const prepareLogger = require('../util/log').prepareLogger

const _cache = {}

AWS.config.update({region: process.env.AWS_REGION || 'us-west-2'})

function findRegions() {
  if (process.env.REGIONS) {
    return Promise.resolve(
      process.env.REGIONS.split(',').map(s => s.trim())
    )
  }
[]
  const log = prepareLogger('findRegions')
  const ec2 = new AWS.EC2()
  const regionFromPayload = payload => payload.RegionName

  return new Promise((resolve, reject) => {
    ec2.describeRegions({}, (err, data) => err
      ? reject(err)
      : resolve(data.Regions.map(regionFromPayload))
    )
  }).then(r => log(`found regions: ${JSON.stringify(r)}`, 1) || r)
}

function pickImageWinner(images, options) {
  const log = prepareLogger('pickImageWinner')

  let winner
  let winnerTimestamp = 0
  let filterRc = /[^\w]rc[^\w]/

  images.map(image => {
    let ts = Date.parse(image.CreationDate)

    if (ts <= winnerTimestamp) {
      return log(`drop old image ${image.Name}`, 1)
    }

    if (image.Name.match(filterRc)) {
      return log(`skip rc image ${image.Name}`, 1)
    }

    log(`take winner ${image.Name}`, 1)

    winner = image
    winnerTimestamp = ts
  })

  return extend(winner, {_Region: options.region, _Family: options.family})
}

function harvestHvmRegionNameWinner(options, ec2) {
  return new Promise((resolve, reject) => {
    const param = {
      Owners: ['amazon'],
      Filters: [
        {Name: 'name', Values: [options.nf]},
        {Name: 'virtualization-type', Values: ['hvm']},
        {Name: 'root-device-type', Values: ['ebs']},
        {Name: 'architecture', Values: ['x86_64']},
      ]
    }

    ec2.describeImages(param, (err, result) => {
      return err
        ? reject(err)
        : resolve(pickImageWinner(result.Images, options))
    })
  })
}

function harvestRegion(region) {
  const log = prepareLogger('harvestRegion')
  const ec2 = new AWS.EC2({region})

  const nameFilters = [
    {region, family: 'ecs_hvm64', nf: 'amzn-ami-*-amazon-ecs-optimized'},
    {region, family: 'ec2_hvm64', nf: 'amzn-ami-*-gp2'},
    {region, family: 'nat_hvm64', nf: 'amzn-ami-vpc-nat-*'},
  ]

  log(`reading from ${region}`, 3)

  let subQueries = nameFilters.map(
    options => harvestHvmRegionNameWinner(options, ec2)
  )
  return Promise.all(subQueries).then(
    r => log(`complete ${region}`, 3) || r
  )
}

function formatImages(results) {
  const output = {}
  results.map(r => {
    output[r._Region] = output[r._Region] || {}
    output[r._Region][r._Family] = r.ImageId
  })

  return output
}

function updateCache(output) {
  _cache.Ami = output
  return Promise.resolve(output)
}

function collectAmi() {
  if (_cache.Ami) {
    return Promise.resolve(_cache.Ami)
  }

  return findRegions()
      .then(regions => Promise.all(regions.map(harvestRegion)))
      .then(lst => lst.reduce((a, b) => a.concat(b))) // flatten List
      .then(formatImages)
      .then(updateCache)
}

module.exports = collectAmi
