const { promisify } = require('util')

const request = require('request')
const xml2js = require('xml2js')

const logger = require('../logger')

const DataSourceUrl = 'https://vipmember.tmtd.cpc.com.tw/OpenData/ListPriceWebService.asmx'

const ProductNameMapping = Object.freeze({
  '92無鉛汽油': '92',
  '95無鉛汽油': '95',
  '98無鉛汽油': '98',
  '超級柴油': 'diesel',
})

const ColumnNameMapping = Object.freeze({
  '產品名稱': 'item',
  '參考牌價': 'price',
  '牌價生效時間': 'effective',
})

async function fetchBody (options) {
  const func = 'fetchBody'
  logger.info({ func, event: 'fetching' })

  options = options || {}
  const url = options.url || DataSourceUrl

  const postBody = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <getCPCMainProdListPrice xmlns="http://tmtd.cpc.com.tw/" />
    </soap12:Body>
  </soap12:Envelope>`

  const postParams = {
    url,
    gzip: true,
    headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
    body: postBody,
  }

  const requestPost = promisify(request.post)
  const response = await requestPost(postParams)
  const body = response.body

  logger.info({ func, event: 'fetch complete' })

  return { body }
}

async function parseXml (payload) {
  const parseXmlString = promisify(xml2js.parseString)
  const parsed = await parseXmlString(payload.body)

  return Object.assign(payload, { json: parsed })
}

function extractPricing (payload) {
  let pricingTable = payload.json['soap:Envelope']['soap:Body'][0]
    .getCPCMainProdListPriceResponse[0]
    .getCPCMainProdListPriceResult[0]['diffgr:diffgram'][0]
    .NewDataSet[0].tbTable

  let items = []

  for (let pricing of pricingTable) {
    try {
      let buf = {}
      let productName = pricing['產品名稱'][0]

      if (!ProductNameMapping[productName]) {
        continue
      }

      for (let columnFind in ColumnNameMapping) {
        let columnReplace = ColumnNameMapping[columnFind]

        buf[columnReplace] = (columnReplace === 'price')
          ? Number.parseFloat(pricing[columnFind][0])
          : pricing[columnFind][0]
      }

      items.push(buf)
    } catch (err) {
      console.error(err)
      continue
    }
  }

  return Object.assign(payload, { items })
}

async function fetchPricing () {
  const payload = await fetchBody()
  await parseXml(payload)
  extractPricing(payload)

  delete payload.body
  delete payload.json

  return payload
}

module.exports = {
  fetchPricing,
}
