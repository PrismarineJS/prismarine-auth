const { Authflow } = require('prismarine-auth')
const { XboxClient, PlayFabClient } = require('prismarine-xbox-services')

async function main () {
  const [, , username, cacheDirectory] = process.argv
  const auth = new Authflow(username, cacheDirectory)
  const xbox = new XboxClient(auth)
  console.log(await xbox.getProfile())

  // getPlayfabLogin currently authenticates for Minecraft Bedrock's PlayFab title.
  const playfab = new PlayFabClient(() => auth.getPlayfabLogin(), { titleId: '20CA2' })
  console.log(await playfab.getTitleData())
}

main().catch(error => { console.error(error); process.exitCode = 1 })
