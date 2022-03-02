const _getRealms = require('./methods/getRealms')

const AuthFlow = require('../MicrosoftAuthFlow')
const { Endpoints } = require('../common/Constants')

class RealmAPI {
  constructor (username = '', cache = __dirname, options = {}, codeCallback) {
    this.auth = new AuthFlow(username, cache, { ...options, relyingParty: Endpoints.RealmsRelyingParty }, codeCallback)
    this.getRealms = () => _getRealms(this.auth)
  }
}

module.exports = RealmAPI
