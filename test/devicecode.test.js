/* eslint-env jest */
const { Authflow } = require('..')
const ec = require('js-crypto-ec')

const curve = 'P-384'

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

    ec.generateKey(curve).then(keypair => {
      const clientX509 = keypair.toString('base64')
      console.log(clientX509)
      const flow = new Authflow('username', './test', { }, onMsaCode)
      flow.getMinecraftBedrockToken(clientX509)
    })
  })
})
