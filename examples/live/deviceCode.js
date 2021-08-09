const { Authflow, Titles } = require('prismarine-auth')
const crypto = require('crypto')
const curve = 'secp384r1'

if (process.argv.length !== 4) {
  console.log('Usage: node deviceCode.js <username> <cacheDirectory>')
  process.exit(1)
}

const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve }).toString('base64')
const doAuth = async () => {
  const flow = new Authflow(process.argv[2], process.argv[3], { authTitle: Titles.MinecraftNintendoSwitch })
  const XSTSToken = await flow.getMinecraftBedrockToken(keypair)
  console.log(XSTSToken)
}

doAuth()
