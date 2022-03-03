const fetch = require('../../fetch')
const { Endpoints } = require('../../common/Constants')

module.exports = async (auth) => {
  return await auth.getXboxToken().then(fetch(`${Endpoints.RealmsBedrockAPIHost}/worlds`, { method: 'get' })).then(e => e.servers)
}
