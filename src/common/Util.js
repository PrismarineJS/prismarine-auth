const debug = require('debug')('prismarine-auth')
const crypto = require('crypto')

async function checkStatus (res, errorDict) {
  const { body, data } = await readResponseBody(res, { strictJson: res.ok })

  if (!res.ok) {
    debug('Request fail', body)
    const message = [`HTTP ${res.status}`, res.statusText, body, errorDict?.[res.status]].filter(part => part).join(' ')
    const err = new Error(message)
    err.response = res
    err.body = body
    err.data = data
    throw err
  }

  return data
}

async function readResponseBody (res, options = {}) {
  const contentType = res.headers.get('content-type') || ''
  const body = await res.text()

  return {
    body,
    data: parseResponseBody(body, contentType.includes('application/json'), res, options)
  }
}

function parseResponseBody (body, isJson, res, { strictJson = false } = {}) {
  if (!isJson || !body) return body

  try {
    return JSON.parse(body)
  } catch (cause) {
    if (!strictJson) return body

    const err = new Error(`Failed to parse response as JSON (${res.status} ${res.statusText}): ${body}`)
    err.cause = cause
    err.response = res
    err.body = body
    err.data = body
    throw err
  }
}

function createHash (input) {
  return crypto.createHash('sha1')
    .update(input ?? '', 'binary')
    .digest('hex').substr(0, 6)
}

function nextUUID () {
  return globalThis.crypto.randomUUID()
}

module.exports = { checkStatus, createHash, nextUUID }
