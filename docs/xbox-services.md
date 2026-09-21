# Xbox and PlayFab services

`prismarine-auth` obtains and caches credentials. The experimental
[prismarine-xbox-services](https://github.com/PrismarineJS/prismarine-xbox-services)
package uses them for Xbox profiles, multiplayer sessions, real-time activity
(RTA), and PlayFab service requests. It requires Node.js 24 or later.

Until the services package is published to npm, install the tested Git revision:

```sh
npm install prismarine-auth PrismarineJS/prismarine-xbox-services#052a9676f514c5470a723651b1dbb1adcf238944
```

Pass an Authflow directly to `new XboxClient(authflow)`. The services client asks
for Xbox tokens as needed, leaving token refresh and caching to prismarine-auth.
For multiplayer, also provide the title's `titleId`, `scid` and `templateName`.
Game-specific session properties belong in the consuming game library.

`PlayFabClient` accepts a credential callback. The existing `getPlayfabLogin()`
method is configured for **Minecraft Bedrock**, PlayFab title `20CA2`; it is not
a login provider for arbitrary PlayFab titles. Other titles need a matching
credential provider. Login remains separate from authenticated service calls.

Run the [example](../examples/xbox/services.js) with:

```sh
node examples/xbox/services.js my-account ./auth-cache
```

The services package is a development dependency here, used by examples and
integration tests. Applications must install it themselves; it is not re-exported
by prismarine-auth. See its README for the experimental API and session cleanup.
