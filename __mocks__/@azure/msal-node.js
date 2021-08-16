exports.PublicClientApplication = class {
  acquireTokenByDeviceCode (req) {
    req.deviceCodeCallback('dummy token')
    return Promise.resolve({
      account: {
        username: 'dummy username'
      }
    })
  }

  acquireTokenByRefreshToken (req) {
    return Promise.resolve()
  }
}
