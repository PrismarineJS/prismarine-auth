const { requestJson } = require('./http')

const isXuid = xuid => /^\d+$/.test(xuid)

class XboxClient {
  constructor (authflow, options = {}) {
    this.authflow = authflow
    this.options = options
    this.requests = new Set()
  }

  async get (url, config = {}) {
    return await this._request('GET', { url, ...config })
  }

  async post (url, config = {}) {
    return await this._request('POST', { url, ...config })
  }

  async put (url, config = {}) {
    return await this._request('PUT', { url, ...config })
  }

  async delete (url, config = {}) {
    return await this._request('DELETE', { url, ...config })
  }

  async _request (method, config) {
    const controller = new AbortController()
    this.requests.add(controller)
    try {
      return await requestJson(this.authflow, method, config, controller, this.options.timeout)
    } finally {
      this.requests.delete(controller)
    }
  }

  abortPending () {
    for (const controller of this.requests) controller.abort(new Error('Xbox request cancelled'))
  }

  requireSessionConfig () {
    for (const field of ['scid', 'templateName']) {
      if (!this.options[field]) throw new TypeError(`Xbox session requires ${field}`)
    }
  }

  sessionRef (name) {
    this.requireSessionConfig()
    return { scid: this.options.scid, templateName: this.options.templateName, name }
  }

  sessionUrl (name) {
    const ref = this.sessionRef(name)
    return `https://sessiondirectory.xboxlive.com/serviceconfigs/${encodeURIComponent(ref.scid)}/sessionTemplates/${encodeURIComponent(ref.templateName)}/sessions/${encodeURIComponent(ref.name)}`
  }

  async getProfile (input) {
    input = input === 'me' ? 'me' : isXuid(input) ? `xuids(${input})` : `gt(${encodeURIComponent(input)})`
    const response = await this.get(`https://profile.xboxlive.com/users/${input}/settings`, { contractVersion: '2' })

    return response.profileUsers[0]
  }

  async sendHandle (payload) {
    this.requireSessionConfig()
    return this.post('https://sessiondirectory.xboxlive.com/handles', {
      data: payload,
      contractVersion: '107'
    })
  }

  async setActivity (sessionName) {
    return this.sendHandle({
      version: 1,
      type: 'activity',
      sessionRef: this.sessionRef(sessionName)
    })
  }

  async sendInvite (sessionName, xuid) {
    if (!this.options.titleId) throw new TypeError('Xbox invitations require titleId')
    return this.sendHandle({
      version: 1,
      type: 'invite',
      sessionRef: this.sessionRef(sessionName),
      invitedXuid: xuid,
      inviteAttributes: { titleId: this.options.titleId }
    })
  }

  async getSessions (xuid) {
    this.requireSessionConfig()
    const response = await this.post('https://sessiondirectory.xboxlive.com/handles/query?include=relatedInfo,customProperties', {
      data: {
        type: 'activity',
        scid: this.options.scid,
        owners: {
          people: {
            moniker: 'people',
            monikerXuid: xuid
          }
        }
      },
      contractVersion: '107'
    })

    return response.results
  }

  async getSession (sessionName) {
    this.requireSessionConfig()
    const response = await this.get(this.sessionUrl(sessionName), {
      contractVersion: '107'
    })

    return response
  }

  async updateSession (sessionName, payload) {
    this.requireSessionConfig()
    const response = await this.put(this.sessionUrl(sessionName), {
      data: payload,
      contractVersion: '107'
    })

    return response
  }

  async addConnection (sessionName, xuid, connectionId, subscriptionId) {
    const payload = {
      members: {
        me: {
          constants: { system: { xuid, initialize: true } },
          properties: {
            system: { active: true, connection: connectionId, subscription: { id: subscriptionId, changeTypes: ['everything'] } }
          }
        }
      }
    }

    await this.updateSession(sessionName, payload)
  }

  async updateConnection (sessionName, connectionId) {
    const payload = {
      members: { me: { properties: { system: { active: true, connection: connectionId } } } }
    }

    await this.updateSession(sessionName, payload)
  }

  async leaveSession (sessionName) {
    await this.updateSession(sessionName, { members: { me: null } })
  }
}

module.exports = { XboxClient, isXuid }
