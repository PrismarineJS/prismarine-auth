/* eslint-env jest */
const { Authflow, Titles } = require('..')
const ec = require('js-crypto-ec')

describe('device code authentication', () => {
  it('should give us a token', async () => {
    const onMsaCode = jest.fn()
    const flow = new Authflow('emailIdentifier@test.prismarine', './test', { }, onMsaCode)
    await flow.getXboxToken()
    expect(onMsaCode).toHaveBeenCalledWith(expect.stringMatching(/dummy token/))
  })

  it('should error if no certificate is present for bedrock', () => {
    const flow = new Authflow('testauthflow', './test', { authTitle: Titles.MinecraftNintendoSwitch })
    expect(flow.getMinecraftBedrockToken()).rejects.toThrow('Need to specifiy a ECDH x509 URL encoded public key')
  })

  it('should give us a token for bedrock', async () => {
    const onMsaCode = jest.fn()
    const keypair = ec.generateKey('P-384')
    const clientX509 = keypair.toString('base64')
    const flow = new Authflow('username', './test', { authTitle: Titles.MinecraftNintendoSwitch }, onMsaCode)
    await flow.getMinecraftBedrockToken(clientX509)
    expect(onMsaCode).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.any(String)
    }))
  })
})
