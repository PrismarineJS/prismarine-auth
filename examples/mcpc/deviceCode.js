const { Authflow, Titles } = require('../index')

if (process.argv.length !== 4) {
  console.log('Usage: node deviceCode.js <username> <cacheDirectory>')
  process.exit(1)
}

const doAuth = async () => {
  const flow = new Authflow(process.argv[2], process.argv[3], { authTitle: Titles.MinecraftJava })
  const response = await flow.getMinecraftJavaToken({ fetchEntitlements: true, fetchProfile: true })
  console.log(response)
}

doAuth()
