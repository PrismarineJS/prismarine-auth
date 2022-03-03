const fetch = require('../../fetch')
const { Endpoints } = require('../../common/Constants')

module.exports = async (auth, options) => {
    const host = await auth.getXboxToken().then(fetch(`${Endpoints.RealmsBedrockAPIHost}/worlds/${options.realmId}/join`, { method: 'get' }))
    const [ip, port] = host.address.split(':')
    return { ip, port, ...host }
}
