/* eslint-env mocha */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const { Authflow } = require('../')
chai.use(chaiAsPromised)
const { expect } = chai

const crypto = require('crypto')
const curve = 'secp384r1'

describe('device code authentication', () => {
  it('should fail if not given any options', (done) => {
    expect(() => new Authflow()).to.throw(Error)
    done()
  })
  it('should fail if not given a cache directory', (done) => {
    expect(() => new Authflow('username')).to.throw(Error)
    done()
  })
  it('should give us a token', (done) => {
    const onMsaCode = (code) => {
      if (!code) done(Error('missing user code'))
      if (code.userCode) done()
    }
    const flow = new Authflow('emailIdentifier@test.prismarine', './', { }, onMsaCode)
    flow.getXboxToken()
  })
  it('should error if no certificate is present for bedrock', async () => {
    const flow = new Authflow('testauthflow', './')
    await expect(flow.getMinecraftBedrockToken()).to.eventually.be.rejectedWith('Need to specifiy a ECDH x509 URL encoded public key')
  })
  it('should give us a token for bedrock', (done) => {
    const onMsaCode = (code) => {
      if (!code) done(Error('missing user code'))
      if (code.userCode) done()
    }

    const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve })
    const clientX509 = keypair.toString('base64')
    const flow = new Authflow('username', './', { }, onMsaCode)
    flow.getMinecraftBedrockToken(clientX509)
  })
})
