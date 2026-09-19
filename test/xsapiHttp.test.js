/* eslint-env mocha */
const assert = require('assert')
const { XboxClient } = require('../').experimental.xsapi
const title = { titleId: '123', scid: 'test-scid', templateName: 'TestLobby' }
const tick = () => new Promise(resolve => setImmediate(resolve))

describe('Xbox HTTP requests', () => {
  let originalFetch
  const auth = { getXboxToken: async () => ({ userHash: 'hash', XSTSToken: 'test-token' }) }
  beforeEach(() => { originalFetch = global.fetch })
  afterEach(() => { global.fetch = originalFetch })

  it('accepts empty successful responses, including 204', async () => {
    for (const status of [200, 204]) {
      global.fetch = async () => new Response(null, { status })
      assert.strictEqual(await new XboxClient(auth).get('https://example.com'), undefined)
    }
  })

  it('sets JSON headers and preserves IDs and falsy request bodies', async () => {
    global.fetch = async (url, request) => {
      assert.strictEqual(request.headers['content-type'], 'application/json')
      assert.strictEqual(request.headers.accept, 'application/json')
      assert.strictEqual(request.headers['x-xbl-contract-version'], '107')
      assert.strictEqual(request.body, 'false')
      return new Response('{"id":18446744073709551615}')
    }
    const response = await new XboxClient(auth).post('https://example.com', { data: false, contractVersion: '107' })
    assert.strictEqual(response.id, '18446744073709551615')
  })

  it('surfaces unsuccessful HTTP status and malformed JSON', async () => {
    global.fetch = async () => new Response('unavailable', { status: 503 })
    await assert.rejects(new XboxClient(auth).get('https://example.com'), /503.*unavailable/)
    global.fetch = async () => new Response('{')
    await assert.rejects(new XboxClient(auth).get('https://example.com'))
  })

  it('bounds pending authentication and never fetches after a timeout', async () => {
    let resolveToken
    let fetched = false
    global.fetch = async () => { fetched = true }
    const pendingAuth = { getXboxToken: () => new Promise(resolve => { resolveToken = resolve }) }
    const rest = new XboxClient(pendingAuth, { timeout: 10 })
    await assert.rejects(rest.get('https://example.com'), /timed out/)
    resolveToken(await auth.getXboxToken())
    await tick()
    assert.strictEqual(fetched, false)
    assert.strictEqual(rest.requests.size, 0)
  })

  it('bounds response-body reading and aborts the fetch signal', async () => {
    let signal
    global.fetch = async (url, request) => {
      signal = request.signal
      return { ok: true, text: () => new Promise(() => {}) }
    }
    await assert.rejects(new XboxClient(auth, { timeout: 10 }).get('https://example.com'), /timed out/)
    assert.strictEqual(signal.aborted, true)
  })

  it('cancels active requests without preventing subsequent session cleanup requests', async () => {
    global.fetch = () => new Promise(() => {})
    const rest = new XboxClient(auth, title)
    const request = assert.rejects(rest.get('https://example.com'), /cancelled/)
    rest.abortPending()
    await request
    global.fetch = async () => new Response(null, { status: 204 })
    await rest.leaveSession('world')
    assert.strictEqual(rest.requests.size, 0)
  })

  it('honors caller cancellation before and during a request', async () => {
    for (const beforehand of [true, false]) {
      const controller = new AbortController()
      global.fetch = () => new Promise(() => {})
      if (beforehand) controller.abort(new Error('caller cancelled'))
      const request = assert.rejects(new XboxClient(auth).get('https://example.com', { signal: controller.signal }), /caller cancelled/)
      if (!beforehand) controller.abort(new Error('caller cancelled'))
      await request
    }
  })
})
