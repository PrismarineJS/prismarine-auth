const { Authflow, Titles } = require('prismarine-auth')

if (process.argv.length !== 5) {
  console.log('Usage: node password.js <username> <password> <cacheDirectory>')
  process.exit(1)
}

const doAuth = async () => {
  const flow = new Authflow(process.argv[2], process.argv[4], { password: process.argv[3], authTitle: Titles.MinecraftNintendoSwitch, flow: 'live' })
  const response = await flow.getXboxToken()
  console.log(response)
}

doAuth()
