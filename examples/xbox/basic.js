const { Authflow } = require('prismarine-auth')
const flow = new Authflow() // No parameters needed
flow.getXboxToken().then(console.log)
