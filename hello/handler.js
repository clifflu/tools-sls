'use strict'

// Your first function handler
module.exports = (event, context, cb) => cb(null,
  { 
    statusCode: 200, 
    headers: {},
    body: JSON.stringify({ event , env: process.env}),
  }
)

// You can add more handlers here, and reference them in serverless.yml
