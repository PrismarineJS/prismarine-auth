/* eslint-env mocha */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

const XboxLiveAuth = require('../')

describe('password authentication', () => {
  it('should fail if not given a valid password', async () => {
    await expect(XboxLiveAuth.authenticate({ username: 'this.is.not@valid.email.lol', password: 'sdfasdgf', cacheDirectory: './' })).to.eventually.be.rejectedWith('Invalid credentials')
  })
})
