/* eslint-env jest */
const { Authflow } = require('..')

describe('password authentication', () => {
  it('should fail if not given a valid password', () => {
    const flow = new Authflow('this.is.not@valid.email.lol', './test', { password: 'sdfasdfas' })
    expect(flow.getXboxToken()).rejects.toThrow('Invalid credentials')
  })
})
