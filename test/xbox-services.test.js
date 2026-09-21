/* eslint-env mocha */
const assert = require('assert')
const { Authflow } = require('..')
const { XboxClient, PlayFabClient } = require('prismarine-xbox-services')

describe('Xbox services integration', () => {
  let originalFetch
  beforeEach(() => { originalFetch = global.fetch })
  afterEach(() => { global.fetch = originalFetch })

  it('obtains Xbox credentials from Authflow for each service request', async () => {
    const auth = new Authflow('test', () => ({}))
    let tokens = 0
    auth.getXboxToken = async relyingParty => {
      assert.strictEqual(relyingParty, 'http://xboxlive.com')
      return { userHash: 'user', XSTSToken: `token-${++tokens}` }
    }
    global.fetch = async (url, { headers }) => {
      assert.strictEqual(new URL(url).hostname, 'profile.xboxlive.com')
      assert.strictEqual(headers.authorization, `XBL3.0 x=user;token-${tokens}`)
      return Response.json({ profileUsers: [{ id: '12345', settings: [{ id: 'Gamertag', value: 'Player' }] }] })
    }
    const xbox = new XboxClient(auth)
    assert.strictEqual((await xbox.getProfile()).gamertag, 'Player')
    assert.strictEqual((await xbox.getProfile()).xuid, '12345')
    assert.strictEqual(tokens, 2)
  })

  it('uses Minecraft PlayFab login credentials for the matching title', async () => {
    const auth = new Authflow('test', () => ({}))
    auth.getPlayfabLogin = async () => ({ SessionTicket: 'session', EntityToken: { EntityToken: 'entity' } })
    const playfab = new PlayFabClient(() => auth.getPlayfabLogin(), { titleId: '20CA2' })
    global.fetch = async (url, { headers }) => {
      assert.strictEqual(url, 'https://20CA2.playfabapi.com/Client/GetTitleData')
      assert.strictEqual(headers['X-Authorization'], 'session')
      return Response.json({ data: { Data: { setting: 'value' } } })
    }
    assert.strictEqual((await playfab.getTitleData()).Data.setting, 'value')
  })
})
