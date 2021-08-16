const { setupServer } = require('msw/node')
const { handlers } = require('./handlers.js')

exports.server = setupServer(...handlers)
