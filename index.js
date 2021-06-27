if (typeof process !== 'undefined' && parseInt(process.versions.node.split('.')[0]) < 14) {
  console.error('Your node version is currently', process.versions.node)
  console.error('Please update it to a version >= 14.x.x from https://nodejs.org/')
  process.exit(1)
}

module.exports = {
  Tokens: require('./src/Tokens'),
  Authflow: require('./src/MicrosoftAuthFlow'),
  authenticate: require('./src/MicrosoftAuthentication'),
  ...require('./src/Constants') // Titles, Authenticatiom msalConfig
}
