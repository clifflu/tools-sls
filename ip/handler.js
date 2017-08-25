'use strict'

function handler (evt, ctx, cb) {
  try {
    cb(null, {
        statusCode: 200,
        body: JSON.stringify({sourceIp: getIp(evt)})
    })
  } catch (ex) {
      console.error(ex)
    cb('unknown sourceIp')
  }
}

/**
 *
 * @param evt
 * @param evt.headers
 * @param evt.identity
 * @returns IP
 * @throws Error
 */
function getIp (evt) {
  const candidates = evt.headers['X-Forwarded-For'].split(', ')
  const probe = evt.requestContext.identity.sourceIp
  var idx

  /**
   * Assumes CF -> API Gateway, so that sourceIp is from CF
   * Reply with IP before CF for it's the IP customer sees
   */
  for (idx = 0; idx < candidates.length; idx++) {
    if (probe === candidates[idx]) {
      if (idx === 0) {
        // Possibly without CF in this deployment
        return candidates[0]
      }
      return candidates[idx - 1]
    }
  }
  throw new Error()
}

module.exports = handler

