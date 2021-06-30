# XboxLive-Auth
[![NPM version](https://img.shields.io/npm/v/prismarine-template.svg)](http://npmjs.com/package/prismarine-template)
[![Build Status](https://github.com/PrismarineJS/prismarine-template/workflows/CI/badge.svg)](https://github.com/PrismarineJS/prismarine-template/actions?query=workflow%3A%22CI%22)
[![Discord](https://img.shields.io/badge/chat-on%20discord-brightgreen.svg)](https://discord.gg/GsEFRM8)
[![Try it on gitpod](https://img.shields.io/badge/try-on%20gitpod-brightgreen.svg)](https://gitpod.io/#https://github.com/PrismarineJS/prismarine-template)

Quickly and easily obtain an xbox token to authenticate with Minecraft/Mojang

## Installation
```shell
npm install xboxlive-auth
```

## Usage

Device Code Authentication:
```js
const doAuth = async() => {
    const XAuth = require('xboxlive-auth');
    const XSTSToken = await XAuth.authenticate({ username: 'mineflayer@is.cool' });
    console.log(XSTSToken)
}

doAuth()
```

Password Authentication (falls back to DeviceCode):
```js
const doAuth = async() => {
    const XAuth = require('xboxlive-auth');
    const XSTSToken = await XAuth.authenticate({ username: 'mineflayer@is.cool', password: 'GoCheckItOut!123' });
    console.log(XSTSToken)
}

doAuth()
```

### Expected Response
```php
{
    "userXUID": "2584878536129841", // May be null
    "userHash": "3218841136841218711",
    "XSTSToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiWGJveFJlcGxheS5uZXQifQ.c2UraxPmZ4STYozrjFEW8SBqU0WjnIV0h-jjnfsKtrA",
    "expiresOn": "2020-04-13T05:43:32.6275675Z"
}
```

### Parameters
- options {Object?}
    - username {string} - Required for authentication.
    - [password] {string} - If passed we will do password based authentication.
    - cacheDirectory {string} - Where we will store your tokens until you attempt to login next time.
    - onMsaCode {Function} - 
    - authTitle {string} - Used in authenticating with Switch or Bedrock accounts. See https://github.com/PrismarineJS/xboxlive-auth/src/Constants.js
