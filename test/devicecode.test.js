/* eslint-env jest */

const { Authflow } = require('..')
const ec = require('js-crypto-ec')

describe('device code authentication', () => {
  it('should fail if not given any options', () => {
    expect(() => {
      // eslint-disable-next-line
      new Authflow()
    }).toThrow(Error)
  })

  it('should fail if not given a cache directory', () => {
    expect(() => new Authflow('username')).toThrow(Error)
  })

  it('should give us a token', async () => {
    const onMsaCode = jest.fn()
    const flow = new Authflow('emailIdentifier@test.prismarine', './test', { }, onMsaCode)
    await flow.getXboxToken()
    expect(onMsaCode).toHaveBeenCalledWith(expect.stringMatching(/dummy token/))
  })

  it('should error if no certificate is present for bedrock', () => {
    const flow = new Authflow('testauthflow', './test')
    expect(flow.getMinecraftBedrockToken()).rejects.toThrow('Need to specifiy a ECDH x509 URL encoded public key')
  })

  it('should give us a token for bedrock', async () => {
    const onMsaCode = jest.fn()
    const keypair = ec.generateKey('P-384')
    const clientX509 = keypair.toString('base64')
    const flow = new Authflow('username', './test', { }, onMsaCode)
    await flow.getMinecraftBedrockToken(clientX509)
    expect(onMsaCode).toHaveBeenCalledWith(expect.stringMatching(/dummy token/))
  })
})
