const { Authflow, Titles } = require('prismarine-auth')

const [, , username, cacheDir] = process.argv

if (!username) {
  console.log('Usage: node socks5.js <username> [cacheDirectory]')
  process.exit(1)
}

async function doAuth () {
  const flow = new Authflow(username, cacheDir, {
    authTitle: Titles.MinecraftNintendoSwitch,
    deviceType: 'Nintendo',
    flow: 'live',
    proxy: {
      host: '127.0.0.1',
      port: 1080,
      type: 'socks5'
      // username: 'myuser',
      // password: 'mypassword'
    }
  })
  const response = await flow.getMinecraftJavaToken({ fetchEntitlements: true, fetchProfile: true })
  console.log(response)
}

module.exports = doAuth()
