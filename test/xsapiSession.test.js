/* eslint-env mocha */
const assert = require('assert')
const { XboxClient, SessionDirectory } = require('../').experimental.xsapi
const title = { titleId: '123', scid: 'other-game-scid', templateName: 'OtherLobby' }
const auth = { getXboxToken: async () => ({ userHash: 'hash', XSTSToken: 'token' }) }
const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred () {
  let complete
  const promise = new Promise(resolve => { complete = resolve })
  return { promise, resolve: complete }
}
function connectedSession () {
  const session = new SessionDirectory(auth, title)
  session.connect = async () => {
    session.profile = { id: '12345' }
    session.connectionId = 'connection'
  }
  return session
}

describe('experimental Xbox services', () => {
  it('requires title configuration for managed sessions', () => {
    assert.throws(() => new SessionDirectory(auth), /titleId/)
  })

  it('uses caller title configuration for handles and escapes session paths', async () => {
    const client = new XboxClient(auth, title)
    const requests = []
    client.post = client.put = client.get = async (url, config) => { requests.push({ url, ...config }); return { profileUsers: [{ id: '12345' }] } }
    await client.sendInvite('my session', '12345')
    assert.deepStrictEqual(requests[0].data.sessionRef, { scid: title.scid, templateName: title.templateName, name: 'my session' })
    assert.strictEqual(requests[0].data.inviteAttributes.titleId, title.titleId)
    await client.updateSession('path/segment', {})
    assert(requests[1].url.endsWith('/OtherLobby/sessions/path%2Fsegment'))
    await client.getProfile('12345')
    assert(requests[2].url.includes('xuids(12345)'))
  })

  it('publishes caller properties with the managed Xbox membership', async () => {
    const session = connectedSession()
    const writes = []
    const properties = { system: { closed: false }, custom: { game: 'other-game' } }
    session.client.updateSession = async (name, payload) => { writes.push(payload) }
    session.client.setActivity = async () => {}
    session.client.getSession = async () => ({ properties })
    await session.createSession(({ profile }) => ({ ...properties, custom: { ...properties.custom, owner: profile.id } }))
    assert.deepStrictEqual(writes[0].properties.custom, { game: 'other-game', owner: '12345' })
    assert.strictEqual(writes[0].members.me.properties.system.connection, 'connection')
    assert.strictEqual(writes[0].members.me.constants.system.xuid, '12345')
    assert.strictEqual(writes[0].properties.custom.SupportedConnections, undefined)
    await session.end()
  })

  it('cancels only the ending session and permits a bounded leave request', async () => {
    const originalFetch = global.fetch
    try {
      global.fetch = (url, options) => options.body === '{"members":{"me":null}}'
        ? Promise.resolve(new Response(null, { status: 204 }))
        : new Promise(() => {})
      const first = new SessionDirectory(auth, title)
      const second = new SessionDirectory(auth, title)
      first.name = 'first'
      const cancelled = assert.rejects(first.client.get('https://example.com'), /cancelled/)
      const controller = new AbortController()
      const independent = assert.rejects(second.client.get('https://example.com', { signal: controller.signal }), /independent/)
      await first.end()
      await cancelled
      assert.strictEqual(second.client.requests.size, 1)
      controller.abort(new Error('independent'))
      await independent
      await second.end()
    } finally { global.fetch = originalFetch }
  })

  it('leaves again if an in-flight join completes after end', async () => {
    const session = connectedSession()
    const pending = deferred()
    let leaves = 0
    session.client.addConnection = () => pending.promise
    session.client.leaveSession = async () => { leaves++ }
    session.client.setActivity = async () => { assert.fail('must not publish a closed session') }
    const joining = assert.rejects(session.joinSession('example'), /session is closed/)
    await tick()
    await session.end()
    pending.resolve()
    await joining
    assert.strictEqual(leaves, 2)
  })

  it('leaves again if an in-flight update completes after end', async () => {
    const session = connectedSession()
    session.name = 'example'
    const pending = deferred()
    let leaves = 0
    session.client.updateSession = () => pending.promise
    session.client.leaveSession = async () => { leaves++ }
    const updating = assert.rejects(session.updateSession({}), /session is closed/)
    await session.end()
    pending.resolve()
    await updating
    assert.strictEqual(leaves, 2)
  })

  it('ends once and delegates RTA shutdown', async () => {
    const session = connectedSession()
    let destroyed = 0
    session.rta = {
      destroy: async () => { destroyed++ }
    }
    const ending = session.end()
    assert.strictEqual(session.end(), ending)
    await ending
    assert.strictEqual(destroyed, 1)
  })
  it('terminates a lost Xbox session and reports the failure instead of calling a nonexistent restart', async () => {
    const session = new SessionDirectory({}, title)
    session.name = 'joined-world'
    session._ready = true
    let destroyed = false
    let left = false
    session.rta = { destroy: async () => { destroyed = true } }
    session.client.updateSession = async () => { throw new Error('session gone') }
    session.client.leaveSession = async () => { left = true }
    let failure
    session.on('error', error => { failure = error })
    await session.onSubscribe({ data: { ConnectionId: 'new-connection' } })
    await tick()
    assert.strictEqual(destroyed, true)
    assert.strictEqual(left, true)
    assert.match(failure.message, /session connection was lost/)
    await assert.rejects(session.joinSession('another-world'), /session is closed/)
  })
})

describe('managed RTA lifecycle', () => {
  it('rejects concurrent and repeated starts without replacing the session', async () => {
    const session = connectedSession()
    const pending = deferred()
    session.connect = async () => { await pending.promise; session.profile = { id: '123' }; session.connectionId = 'connection' }
    session.client.addConnection = async () => {}
    session.client.setActivity = async () => {}
    session.client.getSession = async () => ({ properties: {} })
    const first = session.joinSession('first')
    await assert.rejects(session.createSession(), /already started/)
    assert.strictEqual(session.name, 'first')
    pending.resolve()
    await first
    await assert.rejects(session.joinSession('second'), /already started/)
    session.client.leaveSession = async () => {}
    await session.end()
  })

  it('automatically cleans up a failed start', async () => {
    const session = new SessionDirectory(auth, title)
    session.client.getProfile = async () => { throw new Error('profile unavailable') }
    session.client.leaveSession = async () => {}
    await assert.rejects(session.joinSession('example'), /profile unavailable/)
    assert.strictEqual(session._ended, true)
    await session.end()
  })

  it('handles real RTA error events during subscription without throwing', async () => {
    const { XboxRTA } = require('xbox-rta')
    const originalConnect = XboxRTA.prototype.connect
    const originalSubscribe = XboxRTA.prototype.subscribe
    try {
      XboxRTA.prototype.connect = async () => {}
      XboxRTA.prototype.subscribe = async function () {
        assert.doesNotThrow(() => this.emit('error', new Error('subscription failed')))
        throw new Error('subscription failed')
      }
      const session = new SessionDirectory(auth, title)
      session.client.getProfile = async () => ({ id: '123' })
      session.client.leaveSession = async () => {}
      await assert.rejects(session.joinSession('example'), /subscription failed/)
      assert.strictEqual(session._ended, true)
    } finally {
      XboxRTA.prototype.connect = originalConnect
      XboxRTA.prototype.subscribe = originalSubscribe
    }
  })

  it('forwards established RTA errors and closes the session', async () => {
    const { XboxRTA } = require('xbox-rta')
    const originalConnect = XboxRTA.prototype.connect
    const originalSubscribe = XboxRTA.prototype.subscribe
    try {
      XboxRTA.prototype.connect = async () => {}
      XboxRTA.prototype.subscribe = async () => ({ data: { ConnectionId: 'connection' } })
      const session = new SessionDirectory(auth, title)
      session.client.getProfile = async () => ({ id: '123' })
      session.client.addConnection = session.client.setActivity = session.client.leaveSession = async () => {}
      session.client.getSession = async () => ({ properties: {} })
      await session.joinSession('example')
      const failure = new Promise(resolve => session.once('error', resolve))
      session.rta.emit('error', new Error('connection lost'))
      assert.match((await failure).message, /connection lost/)
      assert.strictEqual(session._ended, true)
    } finally {
      XboxRTA.prototype.connect = originalConnect
      XboxRTA.prototype.subscribe = originalSubscribe
    }
  })

  it('does not publish activity after closing during a subscription refresh', async () => {
    const session = connectedSession()
    session.name = 'example'
    session._ready = true
    const pending = deferred()
    session.client.updateSession = () => pending.promise
    session.client.leaveSession = async () => {}
    session.client.setActivity = async () => { assert.fail('must not publish after end') }
    const refresh = session.onSubscribe({ data: { ConnectionId: 'new' } })
    await session.end()
    pending.resolve()
    await refresh
  })
})

describe('RTA startup integration', () => {
  for (const cancel of [false, true]) {
    it(`${cancel ? 'cancels' : 'times out'} RTA authentication without a late nonce request`, async () => {
      const originalFetch = global.fetch
      const token = deferred()
      let fetched = false
      global.fetch = async () => { fetched = true; throw new Error('unexpected fetch') }
      try {
        const session = new SessionDirectory({ getXboxToken: () => token.promise }, { ...title, timeout: 10 })
        session.client.getProfile = async () => ({ id: '123' })
        session.client.leaveSession = async () => {}
        const joining = assert.rejects(session.joinSession('example'), cancel ? /closed/ : /timed out/)
        await tick()
        if (cancel) await session.end()
        await joining
        token.resolve({ userHash: 'hash', XSTSToken: 'token' })
        await tick()
        assert.strictEqual(fetched, false)
        assert.strictEqual(session._ended, true)
        assert.strictEqual(session.rta.ws, null)
      } finally { global.fetch = originalFetch }
    })
  }
})
