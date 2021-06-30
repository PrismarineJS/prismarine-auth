if (typeof process !== 'undefined' && parseInt(process.versions.node.split('.')[0]) < 14) {
  console.error('Your node version is currently', process.versions.node)
  console.error('Please update it to a version >= 14.x.x from https://nodejs.org/')
  process.exit(1)
}

module.exports = {
  MinecraftBedrockTokenManager: require('./src/TokenManagers/MinecraftBedrockTokenManager'),
  MinecraftJavaTokenManager: require('./src/TokenManagers/MinecraftJavaTokenManager'),
  LiveTokenManager: require('./src/TokenManagers/LiveTokenManager'),
  MsaTokenManager: require('./src/TokenManagers/MsaTokenManager'),
  XboxTokenManager: require('./src/TokenManagers/XboxTokenManager'),
  Authflow: require('./src/MicrosoftAuthFlow'),
  authenticate: require('./src/MicrosoftAuthentication'),
  ...require('./src/common/Constants') // Titles, Authenticatiom msalConfig
}
