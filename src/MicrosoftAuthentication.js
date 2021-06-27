const MicrosoftAuthFlow = require('./MicrosoftAuthFlow')

/**
* Authenticates to Minecraft with Microsoft.
*
* @function
* @param {object} options - Client Options
* @param {string} options.username The email of the Minecraft User.
* @param {string} [options.password] The password to your microsoft account. This is optional. If you would rather authenticate using device code, do not pass this.
* @param {string} options.cacheDirectory The directory where you would like to store your tokens for later use.
* @param {Function} options.onMsaCode The call back function for when we recieve your microsoft auth code.
* @param {string} options.authTitle Whether we should be authenticating for the Nintendo Switch, or Bedrock Windows 10
*/
async function authenticate (options) {
  if (!options?.username) throw Error('options.username is a required identifier. this is used to identify your token when logging in.')
  const flow = new MicrosoftAuthFlow(options.username, options.cacheDirectory, options, options.onMsaCode)
  const token = await flow.getXboxToken()
  return token
}

module.exports = authenticate;
