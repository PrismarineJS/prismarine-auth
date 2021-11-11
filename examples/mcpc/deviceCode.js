const { Authflow, Titles } = require('prismarine-auth')

const [, , username, cacheDir] = process.argv

if (!username) {
  console.log('Usage: node deviceCode.js <username> [cacheDirectory]')
  process.exit(1)
}

async function doAuth () {
  const flow = new Authflow(username, cacheDir, { authTitle: Titles.MinecraftJava, deviceType: 'Win32' })
  const response = await flow.getMinecraftJavaToken({ fetchEntitlements: true, fetchProfile: true })
  console.log(response)
}

module.exports = doAuth()
