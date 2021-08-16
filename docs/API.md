## prismarine-auth

### Authflow

This is the main exposed class you interact with. Every instance holds its own token cache.

#### constructor (username?: string, cacheDir?: string, options?: MicrosoftAuthFlowOptions, codeCallback?: Function)

* `username` (optional, default='')
  * When using device code auth - a unique id
  * When using password auth - your microsoft account email
* `cache` (optional, default='node_modules') - Where to store cached tokens. node_modules if not specified.
* `options`
  * `password` (optional) If you specify this option, we use password based auth.
  * `authTitle` (optional). See `require('prismarine-auth').Titles` for a list of possible titles, and FAQ section below for more info. Set to `false` if doing password auth.
  * `relyingParty` (optional) "relying party", apart of xbox auth api
* `codeCallback` (optional) The callback to call when doing device code auth. Otherwise, the code will be logged to the console.

#### getMsaToken () : Promise<string>

[Returns a Microsoft account access token.](https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens)

#### getXboxToken () : Promise<{ userXUID: string, userHash: string, XSTSToken: string, expiresOn: number }>

[Returns XSTS token data](https://docs.microsoft.com/en-us/gaming/xbox-live/api-ref/xbox-live-rest/additional/edsauthorization).

Example usage :
```js
const { Authflow } = require('prismarine-auth')
const flow = new Authflow() // No parameters needed
flow.getXboxToken().then(console.log)
``````

#### getMinecraftJavaToken (options?: { fetchEntitlements?: boolean fetchProfile?: boolean }) : Promise<{ token: string, entitlements: object, profile: object }>

Returns a Minecraft Java Edition auth token. 
* If you specify `fetchEntitlements` optional option, we will check if the account owns Minecraft and return the results of the API call.
* If you specify `fetchProfile`, we will do a call to `https://api.minecraftservices.com/minecraft/profile` for the currently signed in user and returns the results.

### getMinecraftBedrockToken (publicKey: KeyObject): Promise<string[]>

Returns a Minecraft: Bedrock Edition auth token. The first parameter is a Node.js KeyObject. Please see the examples folder for example usage.

The return object are multiple JWTs returned from the auth server, from both the Mojang and Xbox steps.

### Titles

* A list of known client IDs for convenience. Currently exposes `MinecraftNintendoSwitch` and `MinecraftJava`. These should be passed to `Authflow` options constructor.

Example usage :
```js
const { Authflow, Titles } = require('prismarine-auth')
const flow = new Authflow('', './', { authTitle: TitlesMinecraftJava })
flow.getMinecraftJavaToken().then(console.log)
```

## FAQ

### What does "authTitle" do ?

* The auth title is the "Client ID" used for authenticating to Microsoft. [This is apart of Oauth.](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
* By specifying it, the library will do the full authentication sequence which includes contacting the "Xbox Title Server".
  * For any Microsoft account with a date of birth under 18, this is required
  * On Minecraft: Bedrock Edition, servers can additionally verify if you have done the full auth sequence or not, and can kick you if you have not.
  * You will get an error if you don't specify it when calling `getMinecraftJavaToken` or `getMinecraftBedrockToken` when doing device code auth. You can set it to `false` to skip signing.
* If you just want an Microsoft/Xbox token, you do not need to specify a authTitle.
* If doing password auth, set this option to false.