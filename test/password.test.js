/* eslint-env jest */
const { Authflow } = require('..')
const XboxLiveAuth = require('@xboxreplay/xboxlive-auth')

describe('password authentication', () => {
  it('should fail if not given a valid password', async () => {
    const spy = jest.spyOn(XboxLiveAuth, 'logUser').mockImplementation(() => {
      throw new Error('Invalid credentials.')
    })

    const flow = new Authflow('this.is.not@valid.email.lol', './test', { password: 'sdfasdfas', authTitle: false })
    await expect(async () => {
      return flow.getXboxToken()
    }).rejects.toThrow('Invalid credentials')
    spy.mockRestore()
  })
})
