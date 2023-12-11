/* eslint-env mocha */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

const { Authflow, Titles } = require('../')

const email = 'this.is.not@valid.email.lol'

describe('password authentication', () => {
  it('should fail if not given a valid password', async () => {
    const flow = new Authflow(email, './test', { password: 'sdfasdfas', flow: 'live', authTitle: Titles.MinecraftNintendoSwitch })
    await expect(flow.getXboxToken()).to.be.rejectedWith(Error, `Couldn't sign in at https://login.live.com/oauth20_authorize.srf?client_id=00000000441cc96b&redirect_uri=https%3A%2F%2Flogin.live.com%2Foauth20_desktop.srf&response_type=token&scope=service%3A%3Auser.auth.xboxlive.com%3A%3AMBI_SSL with email ${email} and password. Please see https://github.com/PrismarineJS/prismarine-auth/blob/master/docs/API.md#why-is-password-auth-unreliable-`)
  }).timeout(10000)
})
