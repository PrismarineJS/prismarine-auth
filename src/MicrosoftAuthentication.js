const MicrosoftAuthFlow = require('./MicrosoftAuthFlow')

/**
 * Authenticates with Mincrosoft through user credentials, then
 * with Xbox Live, Minecraft, checks entitlements and returns profile
 *
 * @function
 * @param {object} options - Client Options
 */
async function authenticatePassword (options) {
  throw Error('Not implemented')
}

/**
* Authenticates to Minecraft via device code based Microsoft auth,
* then connects to the specified server in Client Options
*
* @function
* @param {object} options - Client Options
* @param {string} options.username The email of the Minecraft User.Error
* @param {string} options.cacheDirectory The directory where you would like to store your tokens for later use.
* @param {Function} options.onMsaCode The call back function for when we recieve your microsoft auth code.
* @param {string} options.authTitle Whether we should be authenticating for the Nintendo Switch, or Bedrock Windows 10
*/
async function authenticateDeviceCode (options) {
  const flow = new MicrosoftAuthFlow(options.username, options.cacheDirectory, options, options.onMsaCode)
  const chain = await flow.getMinecraftToken(options.clientX509)
  return chain
}

module.exports = { authenticateDeviceCode, authenticatePassword }
