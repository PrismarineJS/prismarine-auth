const { Authflow } = require('../index');

if (process.argv.length !== 4) {
    console.log('Usage: node deviceCode.js <username> <cacheDirectory>')
    process.exit(1)
}

const doAuth = async() => {
    const flow = new Authflow(process.argv[2], process.argv[3], { fetchProfile: true, fetchEntitlements: true })
    const response = await flow.getMinecraftJavaToken()
    console.log(response)
}

doAuth()