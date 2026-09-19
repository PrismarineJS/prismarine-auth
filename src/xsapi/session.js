const { v4 } = require('uuid-1345')
const { EventEmitter } = require('events')
const { XboxRTA } = require('xbox-rta')
const { XboxClient, isXuid } = require('./client')

const debug = require('debug')('prismarine-auth:xsapi')

class SessionDirectory extends EventEmitter {
  constructor (authflow, options = {}) {
    super()
    for (const field of ['titleId', 'scid', 'templateName']) {
      if (!options[field]) throw new TypeError(`Xbox session requires ${field}`)
    }
    this.options = { ...options }
    this.authflow = authflow
    this.client = new XboxClient(authflow, this.options)
    this.subscriptionId = v4()
    this.name = ''
    this.profile = null
    this.connectionId = null
    this.rta = null
    this._started = false
    this._ended = false
    this._ready = false
  }

  assertActive () {
    if (this._ended) throw new Error('Xbox session is closed')
  }

  start (name) {
    this.assertActive()
    if (this._started) throw new Error('Xbox session already started; create a new SessionDirectory')
    this._started = true
    this.name = name
  }

  async connect () {
    this.rta = new XboxRTA(this.authflow)
    // Attach before connect/subscribe: the dependency emits errors as well as rejecting requests.
    this.rta.on('error', error => { this.fail(error) })
    this.rta.on('subscribe', event => {
      // Initial subscription is consumed by the awaited subscribe() below.
      if (this._ready) this.onSubscribe(event).catch(error => this.fail(error))
    })
    this.profile = await this.client.getProfile('me')
    this.assertActive()
    await this.rta.connect({ timeout: this.options.timeout })
    this.assertActive()
    const response = await this.rta.subscribe('https://sessiondirectory.xboxlive.com/connections/')
    this.assertActive()
    this.connectionId = response.data.ConnectionId
  }

  fail (error) {
    if (this._ended) return
    const closing = this.end()
    // Startup errors belong to the rejected create/join promise. Established sessions emit.
    if (this._ready) {
      closing.then(() => this.emit('error', error), cleanupError => this.emit('error', cleanupError))
        .catch(error => { debug('Session error listener failed: %s', error.message) })
    } else {
      closing.catch(error => { debug('Session cleanup failed: %s', error.message) })
    }
  }

  async onSubscribe (event) {
    if (this._ended) return
    const connectionId = event.data?.ConnectionId
    if (typeof connectionId !== 'string') return
    this.connectionId = connectionId
    try {
      await this.updateSession({ members: { me: { properties: { system: { active: true, connection: connectionId } } } } })
      this.assertActive()
      await this.client.setActivity(this.name)
    } catch (cause) {
      this.fail(new Error('Xbox session connection was lost', { cause }))
    }
  }

  async joinSession (name) {
    this.start(name)
    try {
      await this.connect()
      this.assertActive()
      await this.client.addConnection(this.name, this.profile.id, this.connectionId, this.subscriptionId)
      await this.checkCompletion()
      await this.client.setActivity(this.name)
      this.assertActive()
      const session = await this.getSession()
      this.assertActive()
      this._ready = true
      return session
    } catch (error) {
      await this.end()
      throw error
    }
  }

  async createSession (properties = {}) {
    this.start(v4())
    try {
      await this.connect()
      this.assertActive()
      const resolved = typeof properties === 'function' ? properties({ profile: this.profile }) : properties
      await this.updateSession({
        properties: resolved,
        members: {
          me: {
            constants: { system: { xuid: this.profile.id, initialize: true } },
            properties: {
              system: { active: true, connection: this.connectionId, subscription: { id: this.subscriptionId, changeTypes: ['everything'] } }
            }
          }
        }
      })
      this.assertActive()
      await this.client.setActivity(this.name)
      this.assertActive()
      const session = await this.getSession()
      await this.updateSession({ properties: session.properties })
      this._ready = true
    } catch (error) {
      await this.end()
      throw error
    }
  }

  end () {
    if (this._endPromise) return this._endPromise
    this._ended = true
    this.client.abortPending()
    this._endPromise = this.closeSession()
    return this._endPromise
  }

  async closeSession () {
    try {
      await this.rta?.destroy()
    } finally {
      if (this.name) {
        await this.client.leaveSession(this.name)
          .catch(error => { debug('Failed to leave session %s: %s', this.name, error.message) })
      }
    }
  }

  async invitePlayer (identifier) {
    this.assertActive()
    if (!isXuid(identifier)) identifier = (await this.client.getProfile(identifier)).id
    this.assertActive()
    await this.client.sendInvite(this.name, identifier)
  }

  async getSession () {
    this.assertActive()
    return this.client.getSession(this.name)
  }

  async checkCompletion () {
    if (this._ended) {
      await this.client.leaveSession(this.name)
      this.assertActive()
    }
  }

  async updateSession (payload) {
    this.assertActive()
    await this.client.updateSession(this.name, payload)
    await this.checkCompletion()
  }
}

module.exports = { SessionDirectory }
