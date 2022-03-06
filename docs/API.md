## prismarine-auth

### Authflow

This is the main exposed class you interact with. Every instance holds its own token cache.

#### constructor (username?: string, cacheDir?: string | CacheFactory, options?: MicrosoftAuthFlowOptions, codeCallback?: Function)

* `username` (optional, default='')
  * When using device code auth - a unique id
  * When using password auth - your microsoft account email
* `cache` (optional, default='node_modules') - Where to store cached tokens or a cache factory function. node_modules if not specified.
* `options`
  * `password` (optional) If you specify this option, we use password based auth.
  * `authTitle` (optional). See `require('prismarine-auth').Titles` for a list of possible titles, and FAQ section below for more info. Set to `false` if doing password auth. Required if doing sisu auth
  * `deviceType` (optional) if specifying an authTitle, the device type to auth as. For example, `Win32`, `iOS`, `Android`, `Nintendo`
  * `doSisuAuth` (optional) If you specify this option, we use sisu based auth.
* `codeCallback` (optional) The callback to call when doing device code auth. Otherwise, the code will be logged to the console.

#### getMsaToken () : Promise<string>

[Returns a Microsoft account access token.](https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens)

#### getXboxToken (relyingParty?: string) : Promise<{ userXUID: string, userHash: string, XSTSToken: string, expiresOn: number }>

[Returns XSTS token data](https://docs.microsoft.com/en-us/gaming/xbox-live/api-ref/xbox-live-rest/additional/edsauthorization).

* `relyingParty` (optional, default='http://xboxlive.com') "relying party", apart of xbox auth api

Example usage :
```js
const { Authflow } = require('prismarine-auth')
const flow = new Authflow() // No parameters needed
flow.getXboxToken().then(console.log)
``````

#### getMinecraftJavaToken (options?: { fetchEntitlements?: boolean fetchProfile?: boolean }) : Promise<{ token: string, entitlements: object, profile: object }>

Returns a Minecraft Java Edition auth token.
* If you specify `fetchEntitlements` optional option, we will check if the account owns Minecraft and return the results of the API call. Undefined if request fails.
* If you specify `fetchProfile`, we will do a call to `https://api.minecraftservices.com/minecraft/profile` for the currently signed in user and returns the results. Undefined if request fails.

### getMinecraftBedrockToken (publicKey: KeyObject): Promise<string[]>

Returns a Minecraft: Bedrock Edition auth token. The first parameter is a Node.js KeyObject. Please see the examples folder for example usage.

The return object are multiple JWTs returned from the auth server, from both the Mojang and Xbox steps.

### Titles

* A list of known client IDs for convenience. Currently exposes `MinecraftNintendoSwitch` and `MinecraftJava`. These should be passed to `Authflow` options constructor (make sure to set appropriate `deviceType`).

Example usage :
```js
const { Authflow, Titles } = require('prismarine-auth')
const flow = new Authflow('', './', { authTitle: Titles.MinecraftNintendoSwitch, deviceType: 'Nintendo' })
flow.getMinecraftJavaToken().then(console.log)
```

### Cache

A cache can be used to alter the cache location. Instead of using the filesystem you can implement the cache your self.

This is done by creating a class that supports three methods:

```typescript
// Return the stored value, this can be called multiple times
getCached(): Promise<any>
// Replace the stored value
setCached(value: any): Promise<void>
// Replace an part of the stored value. Implement this using the spread operator
setCachedPartial(value: any): Promise<void>
```

### CacheFactory

The cache factory is used to create new instances of the cache. This libary will call your factory function for each cache instance it needs to create.

Your function will be passed an object with the following properties:

```js
{
  username: string, // Name of the user we're trying to get a token for
  cacheName: string, // Depends on the cache usage, each cache has a unique name
}
```

You could create a minimal in memory cache like this:

```js
class InMemoryCache {
  private cache = {}
  async getCached () {
    return this.cache
  }
  async setCached (value) {
    this.cache = value
  }
  async setCachedPartial (value) {
    this.cache = {
      ...this.cache,
      ...value
    }
  }
}

const cacheFactory = ({ username, cacheName }) => new InMemoryCache()
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
* If specifying this, you also should provide a `deviceType`, see the doc above

### What does "doSisuAuth" do ?

* When `doSisuAuth` is defined as true, we will generate an xsts token using the sisu flow which is utilised in some Xbox mobile apps.
* This flow allows generation of tokens for authTitles that normally wouldn't work using the normal flow, such as XboxAppIOS, XboxGamepassIOS and MinecraftJava.
* This flow will not currently work for custom Azure apps
* When specifying this, you should also provide an `authTitle` and a corresponding `deviceType`. For example `{ authTitle: Titles.MinecraftJava, deviceType: 'Win32' }` failing this will cause a Forbidden HTTP error.
