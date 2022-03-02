const { RealmAPI } = require('prismarine-auth')

const [, , username, cacheDir] = process.argv

if (!username) {
  console.log('Usage: node realms.js <username> <cacheDirectory>')
  process.exit(1)
}

const getRealms = async () => {
  const api = new RealmAPI(username, cacheDir)
  const response = await api.getRealms()
  console.log(response)
}

getRealms()
