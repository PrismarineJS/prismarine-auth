/* eslint-env mocha */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai

const XboxLiveAuth = require('../')

describe('device code authentication', () => {
  it('should fail if not given any options', async () => {
    await expect(XboxLiveAuth.authenticate({ })).to.eventually.be.rejected
  })
  it('should fail if not given the right options', async () => {
    await expect(XboxLiveAuth.authenticate(false)).to.eventually.be.rejected
  })
  it('should give us a token', (done) => {
    const onMsaCode = (code) => {
      if (!code) done(Error('missing user code'))
      if (code.userCode) done()
    }
    XboxLiveAuth.authenticate({ username: 'emailIdentifier@test.prismarine', onMsaCode, cacheDirectory: './' })
  })
})
