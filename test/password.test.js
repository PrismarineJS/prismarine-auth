/* eslint-env mocha */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

const { Authflow, Titles } = require('prismarine-auth')

describe('password authentication', async () => {
  it('should fail if not given a valid password', async () => {
    const flow = new Authflow('this.is.not@valid.email.lol', './test', { password: 'sdfasdfas', flow: 'live', authTitle: Titles.MinecraftJava })
    try {
      await flow.getXboxToken()
      expect.fail('Expected authentication to fail, but it succeeded')
    } catch (error) {
      expect(error.data.attributes).to.have.property('code', 'INVALID_CREDENTIALS_OR_2FA_ENABLED')
    }
  })
})
