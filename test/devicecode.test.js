/* eslint-env jest */
const { Authflow } = require('..')

const crypto = require('crypto')
const curve = 'secp384r1'

describe('device code authentication', () => {
  it('should fail if not given any options', () => {
    expect(() => {
      // eslint-disable-next-line
      new Authflow()
    }).toThrow(Error)
  })

  it('should fail if not given a cache directory', (done) => {
    expect(() => new Authflow('username')).toThrow(Error)
    done()
  })

  it('should give us a token', (done) => {
    const onMsaCode = (code) => {
      if (!code) done(Error('missing user code'))
      if (code.userCode) done()
    }
    const flow = new Authflow('emailIdentifier@test.prismarine', './test', { }, onMsaCode)
    flow.getXboxToken()
  })

  it('should error if no certificate is present for bedrock', () => {
    const flow = new Authflow('testauthflow', './test')
    expect(flow.getMinecraftBedrockToken()).rejects.toThrow('Need to specifiy a ECDH x509 URL encoded public key')
  })
  it('should give us a token for bedrock', (done) => {
    const onMsaCode = (code) => {
      if (!code) done(Error('missing user code'))
      if (code.userCode) done()
    }

    const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve })
    const clientX509 = keypair.toString('base64')
    const flow = new Authflow('username', './test', { }, onMsaCode)
    flow.getMinecraftBedrockToken(clientX509)
  })
})
