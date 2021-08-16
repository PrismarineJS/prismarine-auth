exports.exchangeRpsTicketForUserToken = (msaAccessToken) => {
  const xblUserToken = 'dummy token'
  return Promise.resolve(xblUserToken)
}

exports.exchangeUserTokenForXSTSIdentity = () => {
  const XSTSIdentity = 'dummy xsts'
  return Promise.resolve(XSTSIdentity)
}

exports.preAuth = () => {
  return Promise.resolve()
}

exports.logUser = () => {
  return Promise.resolve({
    access_token: ''
  })
}
