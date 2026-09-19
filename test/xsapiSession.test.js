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
  session.host.connect = async () => {
    session.host.profile = { id: '12345' }
    session.host.connectionId = 'connection'
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
      first.session.name = 'first'
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
    session.session.name = 'example'
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

  it('ends once and closes an RTA socket that is still connecting', async () => {
    const session = connectedSession()
    let terminated = 0
    let destroyed = 0
    session.host.rta = {
      ws: { readyState: 0, on () {}, terminate () { terminated++ } },
      destroy: async () => { destroyed++ }
    }
    const ending = session.end()
    assert.strictEqual(session.end(), ending)
    await ending
    assert.strictEqual(terminated, 1)
    assert.strictEqual(destroyed, 1)
  })
  it('terminates a lost Xbox session and reports the failure instead of calling a nonexistent restart', async () => {
    const session = new SessionDirectory({}, title)
    session.session.name = 'joined-world'
    let destroyed = false
    let left = false
    session.host.rta = { destroy: async () => { destroyed = true } }
    session.host.rest.updateConnection = async () => { throw new Error('session gone') }
    session.host.rest.leaveSession = async () => { left = true }
    let failure
    session.on('error', error => { failure = error })
    await session.host.onSubscribe({ data: { ConnectionId: 'new-connection' } })
    assert.strictEqual(destroyed, true)
    assert.strictEqual(left, true)
    assert.match(failure.message, /session connection was lost/)
    await assert.rejects(session.joinSession('another-world'), /session is closed/)
  })
})
