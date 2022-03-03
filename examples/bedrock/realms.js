const { Authflow } = require('prismarine-auth')

const [, , username, cacheDir] = process.argv

if (!username) {
  console.log('Usage: node realms.js <username> <cacheDirectory>')
  process.exit(1)
}

const getRealms = async () => {
  const flow = new Authflow(username, cacheDir, { relyingParty: 'https://pocket.realms.minecraft.net/' })
  const response = await flow.getMinecraftRealmConnection({
    realm: {
      type: 'bedrock',
      pickRealm: (realms) => { return realms[0] }
    }
  })
  console.log(response)
}

getRealms()
