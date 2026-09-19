# Experimental Xbox services (XSAPI)

`require('prismarine-auth').experimental.xsapi` exposes `XboxClient` and
`SessionDirectory`. This is an **experimental API**, separate from the stable authentication
API. Names and behavior may change, and the module may move to a separate package.
Consumers should coordinate dependency updates. See [proposal #183](https://github.com/PrismarineJS/prismarine-auth/issues/183).

This module requires Node.js 18 or newer (native fetch, Response and AbortSignal support).
It uses an existing Authflow for token acquisition/caching and xbox-rta for subscriptions.
The dependency is temporarily pinned to a patched fork commit while the upstream lifecycle
fixes are reviewed; it must not be replaced with unpatched 2.2.0.
It contains no Minecraft title IDs, lobby templates, world properties or transport logic.

```js
const { Authflow, experimental } = require('prismarine-auth')
const { XboxClient, SessionDirectory } = experimental.xsapi
const auth = new Authflow(username, cacheDirectory, authOptions)
const title = { titleId, scid, templateName, timeout: 15000 }
const xbox = new XboxClient(auth, title)
const profile = await xbox.getProfile('me')
const handles = await xbox.getSessions(profile.id)

const session = new SessionDirectory(auth, title)
session.on('error', console.error)
try {
  await session.createSession(({ profile }) => ({
    system: { joinRestriction: 'followed', readRestriction: 'followed', closed: false },
    custom: { owner: profile.id, gameMode: 'example' }
  }))
  await session.invitePlayer('SomeGamertag')
  // Keep the session alive for as long as the application needs it.
} finally {
  await session.end()
}
```

The example assumes caller-provided credentials/options and a title with an existing Xbox
service configuration and session template. It does not provision a title or bypass service
permissions. Minecraft consumers construct their Minecraft properties in their own package.

## XboxClient

`new XboxClient(authflow, options = {})` accepts `titleId`, `scid`, `templateName` and
`timeout` (milliseconds, default 15000). Profile and generic HTTP calls do not require title
configuration; session operations require SCID/template, and invitations also require title ID.

- `getProfile(identifier)`: `me`, a decimal XUID string, or a gamertag. All-decimal strings
  are interpreted as XUIDs. Returns the first profile entry.
- `getSessions(xuid)`: activity handles for this SCID and user.
- `getSession(name)`, `updateSession(name, payload)`: read/update the configured session.
- `setActivity(name)`, `sendInvite(name, xuid)`, `leaveSession(name)`: publish activity,
  invite another user, or remove the authenticated member.
- `get`, `post`, `put`, `delete`: `(url, { data, headers, contractVersion, timeout, signal })`.
  These methods attach Xbox authorization credentials; supply trusted Xbox service URLs.
- `abortPending()`: cancel this client's current requests. Later requests remain possible.

HTTP calls use `Authflow.getXboxToken('http://xboxlive.com')`. Bodies are JSON; empty successful
responses return `undefined`. Large JSON numeric IDs are returned as strings to avoid rounding;
smaller numbers remain numbers. HTTP failures expose `error.status` and `error.body` in addition
to a descriptive message. Writes are not automatically retried.

The deadline covers authentication, fetch and body reading. Cancellation stops waiting for auth
and prevents a late HTTP request; it cannot cancel the shared authentication flow itself.

## SessionDirectory

`new SessionDirectory(authflow, { titleId, scid, templateName, timeout })` requires title
configuration and creates a private XboxClient, exposed as `session.client`. Sharing an Authflow
between sessions shares credentials, not request cancellation.

- `createSession(properties = {})`: generate a UUID name, connect to RTA, create membership,
  and publish activity. Properties can be an object or a synchronous `({ profile }) => properties`
  callback evaluated after the owner profile is available. The callback supplies the session
  `properties` object only; the managed API supplies `members.me` connection/subscription data.
- `joinSession(name)`: connect RTA, add the authenticated member, publish activity, and return
  the session document.
- `getSession()`, `updateSession(payload)`, `invitePlayer(identifier)`: operate on the current
  session. Updates are raw Xbox session patches; callers must preserve managed member fields.
- `end()`: idempotent teardown; stop new lifecycle work, cancel the private client's requests,
  close RTA, then attempt a bounded leave request. Leave failures are debug-logged. A late join
  or update completion triggers another leave attempt rather than publishing an ended session.
- `error`: asynchronous subscription/update failures. Register a listener and catch rejected
  promises from explicit operations. Failed create/join operations automatically end the session; explicit cleanup remains idempotent.

Use one SessionDirectory per joined/hosted session. Repeated or concurrent create/join attempts
are rejected without replacing the active connection. RTA startup uses the configured timeout
(default 15 seconds), and end() cancels authentication/nonce waiting and pending subscriptions.
Startup failures reject the create/join promise; established RTA failures emit `error` after cleanup. Calls to its low-level `client` are not
prevented after `end()`; the owner is responsible for not starting new work on an ended session.
Connection fields and request bookkeeping are not public API. Diagnostics use
`DEBUG=prismarine-auth:xsapi`.

The initial extraction retains the existing create-and-publish behavior from bedrock-protocol.
Further API changes can be reviewed while experimental. Service boundary tests use mocked
responses; live authenticated sessions still need integration testing before claiming support
for additional titles.
