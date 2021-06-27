const MicrosoftAuthFlow = require('./MicrosoftAuthFlow');

/**
 * Authenticates with Mincrosoft through user credentials, then
 * with Xbox Live, Minecraft, checks entitlements and returns profile
 *
 * @function
 * @param {object} client - The client passed to protocol
 * @param {object} options - Client Options
 */
async function authenticatePassword(client, options) {
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
async function authenticateDeviceCode(options) {
    try {
        const flow = new MsAuthFlow(options.username, options.cacheDirectory, options, options.onMsaCode)
        const chain = await flow.getMinecraftToken(options.clientX509)
        return chain;
    } catch (err) {
        throw err;
    }
}

module.exports = { authenticateDeviceCode, authenticatePassword }