const { Authflow, Titles } = require('prismarine-auth')

if (process.argv.length !== 4) {
  console.log('Usage: node password.js <username> <cacheDirectory>')
  process.exit(1)
}

const doAuth = async () => {
  const flow = new Authflow(process.argv[2], process.argv[3], { authTitle: Titles.MinecraftJava, deviceType: 'Win32', flow: 'sisu' })
  const response = await flow.getXboxToken()
  console.log(response)
}

doAuth()
