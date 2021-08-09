# prismarine-auth
[![NPM version](https://img.shields.io/npm/v/prismarine-auth.svg)](http://npmjs.com/package/prismarine-auth)
[![Build Status](https://github.com/PrismarineJS/prismarine-auth/workflows/CI/badge.svg)](https://github.com/PrismarineJS/prismarine-auth/actions?query=workflow%3A%22CI%22)
[![Discord](https://img.shields.io/badge/chat-on%20discord-brightgreen.svg)](https://discord.gg/GsEFRM8)
[![Try it on gitpod](https://img.shields.io/badge/try-on%20gitpod-brightgreen.svg)](https://gitpod.io/#https://github.com/PrismarineJS/prismarine-auth)

Quickly and easily obtain an xbox token to authenticate with Minecraft/Mojang

## Installation
```shell
npm install prismarine-auth
```

## Usage

**Parameters**
- username {String} - Username for authentication
- cacheDirectory {String} - Where we will store your tokens
- options {Object?}
    - [password] {string} - If passed we will do password based authentication.
    - [authTitle] {string} - Required to switch to live.com authentication and do title authentication. Needed for accounts with a date of birth under 18 years old.
- onMsaCode {Function} - What we should do when we get the code. Useful for passing the code to another function.

[View more examples](https://github.com/PrismarineJS/prismarine-auth/tree/master/examples)


### Device Code Example
```js
const { Authflow } = require('prismarine-auth');

const doAuth = async() => {
    const flow = new Authflow('i@heart.mineflayer', process.cwd(), { fetchProfile: true })
    const response = await flow.getMinecraftJavaToken()
    console.log(response)
}

doAuth()
```

### Expected Response
```json
{
    "token": "ey....................",
    "entitlements": {},
    "profile": {
        "id": "b945b6ed99b548675309473a69661b9a",
        "name": "Usname",
        "skins": [ [Object] ],
        "capes": []
    }
}
```

## Debugging

You can enable some debugging output using the `DEBUG` enviroment variable.

**Linux**
```bash
DEBUG="prismarine-auth" node [...]
```

**Windows Powershell**
```powershell
$env:DEBUG = "prismarine-auth";node [...]
```

**Windows CMD**
```cmd
set DEBUG="prismarine-auth"
node [...]
```

## Testing

Simply run `npm test` or `yarn test`

## License

[MIT](LICENSE)