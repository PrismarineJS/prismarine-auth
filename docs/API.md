## prismarine-auth

See the [types](../index.d.ts) for additional information on the exposed API.

### Authflow

This is the main exposed class you interact with. Every instance holds its own token cache.

#### constructor (username?: string, cacheDir?: string | CacheFactory, options?: MicrosoftAuthFlowOptions, codeCallback?: Function)

* `username` (optional, default='')
  * When using device code auth - a unique id
  * When using password auth - your microsoft account email
* `cacherOrDir` (optional, default='node_modules') - Where to store cached tokens or a cache factory function. node_modules if not specified.
* `options` (optional)
  * `flow` (required) The auth flow to use. One of `live`, `msal`, `sisu`. If no `options` argument is specified, `msal` will be used.
    * `live` - Generate an XSTS token using the live.com domain which allows for user, device and title authentication. This flow will only work with Windows Live client IDs (such as official Microsoft apps, not custom Azure apps).
    * `msal` - Generates an XSTS token using MSAL (Microsoft Authentication Library) which allows for user authentication only. Use this auth flow for custom Azure apps.
    * `sisu` - See [What does sisu flow do ?](#what-does-sisu-flow-do) for more info.
  * `password` (optional) If you specify this option, we use password based auth. Note this may be unreliable.
  * `authTitle` - The client ID for the service you are logging into. When using the `msal` flow, this is your custom Azure client token. When using `live`, this is the Windows Live SSO client ID - used when authenticating as a Windows app (such as a vanilla Minecraft client). For a list of titles, see `require('prismarine-auth').Titles` and FAQ section below for more info. (Required if using `sisu` or `live` flow, on `msal` flow we fallback to a default client ID.)
  * `deviceType` (optional) if specifying an authTitle, the device type to auth as. For example, `Win32`, `iOS`, `Android`, `Nintendo`
  * `forceRefresh` (optional) boolean - Clear all cached tokens for the specified `username` to get new ones on subsequent token requests
  * `abortSignal` (optional) An AbortSignal to cancel the request
* `codeCallback` (optional) The callback to call when doing device code auth. Otherwise, the code will be logged to the console.

#### getMsaToken () : Promise<string>

[Returns a Microsoft account access token.](https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens)

#### getXboxToken (relyingParty?: string, forceRefresh?: boolean) : Promise<{ userXUID: string, userHash: string, XSTSToken: string, expiresOn: number }>

[Returns XSTS token data](https://docs.microsoft.com/en-us/gaming/xbox-live/api-ref/xbox-live-rest/additional/edsauthorization).

* `relyingParty` (optional, default='http://xboxlive.com') "relying party", apart of xbox auth api
* `forceRefresh` (optional, default=false) If true, we will ignore the cache and get a new token

Example usage :
```js
const { Authflow } = require('prismarine-auth')
const flow = new Authflow() // No parameters needed
flow.getXboxToken().then(console.log)
```

#### getMinecraftJavaToken (options?: { fetchEntitlements?: boolean fetchProfile?: boolean }) : Promise<{ token: string, entitlements: object, profile: object }>

Returns a Minecraft Java Edition auth token.
* If you specify `fetchEntitlements` optional option, we will check if the account owns Minecraft and return the results of the API call. Undefined if request fails.
* If you specify `fetchProfile`, we will do a call to `https://api.minecraftservices.com/minecraft/profile` for the currently signed in user and returns the results. Undefined if request fails.
* If `fetchCertificates` is set to true, we obtain profile keys from Mojang for the player which are used for chat singing.

### getMinecraftBedrockToken (publicKey: KeyObject): Promise<string[]>

Returns a Minecraft: Bedrock Edition auth token. The first parameter is a Node.js KeyObject. Please see the examples folder for example usage.

The return object are multiple JWTs returned from the auth server, from both the Mojang and Xbox steps.

### getPlayfabLogin (): Promise<GetPlayfabLoginResponse>

Returns a Playfab login response which can be used to authenticate to the Playfab API. The SessionTicket returned in the response is used when generating the MCToken.

[Returns ServerLoginResult](https://learn.microsoft.com/en-us/rest/api/playfab/server/authentication/login-with-xbox?view=playfab-rest#serverloginresult)

### getMinecraftBedrockServicesToken ({ version }): Promise<GetMinecraftBedrockServicesResponse>

Returns an mctoken which can be used to query the minecraft-services.net/api and is also used to authenticate the WebSocket connection for the NetherNet WebRTC signalling channel.

The return object contains the `mcToken` and `treatments` relating to the features the user has access to.

### Titles

* A list of known client IDs for convenience. Currently exposes `MinecraftNintendoSwitch` and `MinecraftJava`. These should be passed to `Authflow` options constructor (make sure to set appropriate `deviceType`).

Example usage :
```js
const { Authflow, Titles } = require('prismarine-auth')
const flow = new Authflow('', './', { authTitle: Titles.MinecraftNintendoSwitch, deviceType: 'Nintendo', flow: 'live' })
flow.getMinecraftJavaToken().then(console.log)
```

### Caching

prismarine-auth uses caching so users don't have to repeatedly sign in when authenticating 
to Microsoft/Xbox services.

By default, if you pass a String value to Authflow's `cacherOrDir` function call argument, we use the local file system 
to store and retrieve data to build a cache. However, you may for example not have access to the local file system,
or have a more advanced use-case that requires database retrieval. In these scenarios, you can implement cache storage 
and retrieval yourself to match your needs.

If you pass an object to Authflow's `cacherOrDir` function call argument, you are expected to return a 
*factory object* that implements the following interface:

```ts
interface CacheFactory {
  createCache(options: { username: string, cacheName: string }): Promise<Cache>
  hashKey(cacheName: string, identifier: string): string;
  deleteCache(cacheName: string, identifier: string): Promise<void>
  deleteCaches(cacheName: string): Promise<void>
  cleanup(): Promise<void>
}
```

When .createCache() is called on the factory object, your function should instantiate and return 
a class or an object that implements the `Cache` interface [defined here](../index.d.ts) and copied below:

```ts
interface Cache {
  // Erases all keys in the cache
  reset(): Promise<void>
  // Stores a key-value pair in the cache
  set(key: string, value: any, options: { expiresOn?: number, obtainedOn?: number }): Promise<void>
  // Retrieves a value from the cache
  get(key: string): Promise<{ valid: boolean, value?: any, expiresOn?: number }>
  // Removes all expired keys
  cleanupExpired(): Promise<void>
  // Returns true if the cache is empty
  isEmpty(): Promise<boolean>
}
```

As an example of usage, you could create a minimal in memory cache like this:

```ts
class InMemoryCache implements Cache {
  cache = {}
  async reset () {
    // (should clear the data in the cache like a first run)
  }
  async set (key, value, { expiresOn = Date.now() + 9000, obtainedOn = Date.now() } = {}) {
    this.cache[key] = { value, expiresOn, obtainedOn }
  }
  async get (key) {
    const data = this.cache[key]
    if (!data) return
    return { valid: data.expiresOn > Date.now(), value: data.value }
  }
  cleanupExpired () {
    for (const key in this.cache) {
      if (this.cache[key].expiresOn < Date.now()) {
        delete this.cache[key]
      }
    }
  }
  isEmpty () {
    return Promise.resolve(Object.keys(this.cache).length === 0)
  }
}

const cacheFactory = {
  async createCache ({ username, cacheName }) {
    return new InMemoryCache()
  },
  async deleteCache (cacheName, identifier) {
    // (should delete the cache for the given identifier)
  },
  async deleteCaches (cacheName) {
    // (should delete all caches for the given cacheName)
  },
  async cleanup () {
    // (should clean up any resources used by the cache)
  }
}

// Passed like so:
const authflow = new Authflow('Notch', cacheFactory)
```

## FAQ

### What does "authTitle" do ?

* The auth title is the "Client ID" used for authenticating to Microsoft. [This is apart of Oauth.](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
* By specifying it, the library will do the full authentication sequence which includes contacting the "Xbox Title Server".
  * For any Microsoft account with a date of birth under 18, this is required
  * On Minecraft: Bedrock Edition, servers can additionally verify if you have done the full auth sequence or not, and can kick you if you have not.
  * You will get an error if you don't specify it when calling `getMinecraftJavaToken` or `getMinecraftBedrockToken` when doing device code auth. You can set it to `false` to skip signing.
* If you just want an Microsoft/Xbox token, you do not need to specify a authTitle.
* If doing password auth authTitle will not be used and should be removed.
* If specifying this, you also should provide a `deviceType`, see the doc above

### What does sisu flow do ?

* We will generate an XSTS token using the sisu flow which is utilised in some Xbox mobile apps.
* This flow allows generation of tokens for authTitles that normally wouldn't work using the other flows, such as XboxAppIOS, XboxGamepassIOS and MinecraftJava.
* This flow will not currently work for custom Azure apps
* When specifying this, you should also provide an `authTitle` and a corresponding `deviceType`. For example `{ authTitle: Titles.MinecraftJava, deviceType: 'Win32' }` failing this will cause a Forbidden HTTP error.
