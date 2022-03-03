const _BedrockGetRealms = require('./methods/bedrock/getRealms')
const _BedrockGetRealmConnection = require('./methods/bedrock/getRealmConnection')

class RealmAPI {
  constructor (Authflow) {
    this.bedrock = {
      getRealmConnection: (realmId) => _BedrockGetRealmConnection(Authflow, { realmId }),
      getRealms: () => _BedrockGetRealms(Authflow)
    }
    this.java = {
      
    }
  }
}

module.exports = RealmAPI
