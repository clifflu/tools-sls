'use strict'

const AWS = require('aws-sdk')
const moment = require('moment')
const Push = require('pushover-notifications')
const sprintf = require('sprintf-js').sprintf

const logger = require('../logger')

const cacheTableName = process.env.cache_table_name
const cacheTableKey = process.env.cache_table_key

const pushSession = new Push({
  user: process.env.pushover_userKey,
  token: process.env.pushover_appKey,
})

AWS.config.update({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
})

const ddb = new AWS.DynamoDB()

async function updateStore (payload) {
  const func = 'updateStore'
  const newValue = JSON.stringify(payload.items)

  const putItemOptions = {
    TableName: cacheTableName,
    ReturnValues: 'ALL_OLD',
    Item: {
      pk: { S: cacheTableKey },
      sk: { S: '-' },
      items: { S: newValue },
    },
    ConditionExpression: '#i <> :i',
    ExpressionAttributeNames: {
      '#i': 'items',
    },
    ExpressionAttributeValues: {
      ':i': { S: newValue },
    },
  }

  try {
    const putResponse = await ddb.putItem(putItemOptions).promise()
    logger.info({ func, putResponse })
    if (putResponse.Attributes.items) {
      payload.oldItems = JSON.parse(putResponse.Attributes.items.S)
    }
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      return payload
    }
    throw err
  }

  return payload
}

function composeMessage (payload) {
  function _95Price (items) {
    for (let item of items) {
      if (item.item === '95無鉛汽油') {
        return item.price
      }
    }
    return 666
  }

  function _95title () {
    let newPrice = _95Price(payload.items)
    let oldPrice = payload.oldItems ? _95Price(payload.oldItems) : undefined
    let upPct = oldPrice ? newPrice - oldPrice : 0

    let change = upPct > 0
      ? sprintf('上漲 %.1f 元', upPct)
      : upPct < 0
        ? sprintf('下跌 %.1f 元', -upPct)
        : '不變'

    return `[gasmon] 次期油價${change}`
  }

  function _msg () {
    let buff = {}
    for (let obj of payload.items) {
      buff[obj.effective] = buff[obj.effective] || {}
      buff[obj.effective][obj.item] = obj.price
    }

    let lines = []
    for (let effective in buff) {
      let dtStr = moment(effective).format('MM/DD HH:mm')
      lines.push(`${dtStr} 起生效:`)

      for (let item in buff[effective]) {
        lines.push(sprintf('  %s: %.2f, ', item, buff[effective][item]))
      }
    }

    return lines.join('\n')
  }

  return Object.assign(payload, {
    msg: { title: _95title(), message: _msg() },
  })
}

async function notify (payload) {
  const func = 'notify'

  if (!payload.msg) {
    logger.warn({ func, event: 'payload.msg missing', payload })
    return payload
  }

  if (!payload.oldItems) {
    logger.warn({ func, event: 'payload.oldItems missing', payload })
    return payload
  }

  logger.info({ func, event: 'sending message', msg: payload.msg })
  await pushSend(payload.msg)
  return payload
}

async function pushSend (msg) {
  return new Promise((resolve, reject) => {
    pushSession.send(msg, (data, err) => err ? reject(err) : resolve(data))
  })
}

module.exports = {
  composeMessage,
  notify,
  updateStore,
}
