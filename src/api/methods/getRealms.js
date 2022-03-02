const fetch = require('../fetch')
const { Endpoints } = require('../../common/Constants')

module.exports = async (auth) => await auth.getXboxToken().then(fetch(`${Endpoints.RealmsAPIHost}/worlds`, { method: 'get' }))
