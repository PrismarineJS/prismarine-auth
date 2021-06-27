/* eslint-env jest */

const { authenticatePassword } = require("../src/MicrosoftAuthentication")

describe('authenticatePassword', () => {
  test('throws error', () => {
    expect(() => authenticatePassword.toThrow('Not implemented'))
  })
})
