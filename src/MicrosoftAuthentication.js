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
* @param {object} client - The client passed to protocol
* @param {object} options - Client Options
*/
async function authenticateDeviceCode(client, options) {
    try {
        const flow = new MsAuthFlow(options.username, options.profilesFolder, options, options.onMsaCode)

        const chain = await flow.getMinecraftToken(client.clientX509)
        // console.log('Chain', chain)
        await postAuthenticate(client, options, chain)
    } catch (err) {
        console.error(err)
        client.emit('error', err)
    }
}

module.exports = { authenticateDeviceCode, authenticatePassword }