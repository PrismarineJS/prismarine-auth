import { Authflow, experimental } from '../..'

const auth = new Authflow('example')
const title = { titleId: '123', scid: 'example-scid', templateName: 'ExampleLobby' }
const client = new experimental.xsapi.XboxClient(auth, title)
client.get<{ id: string }>('https://profile.xboxlive.com/users/me/settings', {
  signal: new AbortController().signal,
  timeout: 1000
}).then(value => value?.id.toUpperCase())
const session = new experimental.xsapi.SessionDirectory(auth, title)
session.on('error', console.error)
session.createSession(({ profile }) => ({ custom: { owner: profile.id } }))
session.client.getSessions('123').then(handles => handles[0].sessionRef.name)
session.joinSession('example')
session.updateSession({ properties: { custom: { mode: 'example' } } })
session.invitePlayer('123')
session.end()
// @ts-expect-error Title configuration is required for managed sessions.
new experimental.xsapi.SessionDirectory(auth)
