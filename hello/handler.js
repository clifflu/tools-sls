'use strict'

// Your first function handler
module.exports = (event, context, cb) => cb(null,
  { 
    statusCode: 200, 
    headers: {},
    body: JSON.stringify({msg: 'Go Serverless v1.0! Your function executed successfully!', event }),
  }
)

// You can add more handlers here, and reference them in serverless.yml
