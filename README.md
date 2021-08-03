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

## Getting A Minecraft Java Token

### Device Code Authentication
```js
const { Authflow } = require('prismarine-auth');

const doAuth = async() => {
    const flow = new Authflow('mineflayer@is.cool', './')
    const XSTSToken = await flow.getMinecraftJavaToken()
    console.log(XSTSToken)
}

doAuth()
```

### Password-based Authentication
```js
const { Authflow } = require('prismarine-auth');

const doAuth = async() => {
    const flow = new Authflow('mineflayer@is.cool', './', { password: 'thisIsAFakePassword123'})
    const XSTSToken = await flow.getMinecraftJavaToken()
    console.log(XSTSToken)
}

doAuth()
```

## Getting A Minecraft Bedrock Token
When authenticating for minecraft bedrock edition, you have to generate and send a signed certificate to the bedrock server.
This function handles logging into Xbox Live, posting its public key to the Mojang API, and using the returned certificate signed by Mojang.

### Device Code Authentication
```js
const { Authflow } = require('prismarine-auth');
const crypto = require('crypto')
const curve = 'secp384r1'

const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve }).toString('base64') 
const doAuth = async() => {
    const flow = new Authflow('mineflayer@is.cool', './')
    const XSTSToken = await flow.getMinecraftBedrockToken(keypair)
    console.log(XSTSToken)
}

doAuth()
```

### Password Authentication:
```js
const { Authflow } = require('prismarine-auth');
const crypto = require('crypto')
const curve = 'secp384r1'

const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve }).toString('base64') 

const doAuth = async() => {
    const flow = new Authflow('mineflayer@is.cool', './', { password: 'thisIsAFakePassword123'})
    const XSTSToken = await flow.getMinecraftBedrockToken(keypair)
    console.log(XSTSToken)
}

doAuth()
```

## Live.com Authentication with Titles

### Device Code Authentication
```js
const { Authflow, Titles } = require('prismarine-auth');
const crypto = require('crypto')
const curve = 'secp384r1'

const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve }).toString('base64') 
const doAuth = async() => {
    const flow = new Authflow('mineflayer@is.cool', './', { authTitle: Titles.MinecraftNintendoSwitch })
    const XSTSToken = await flow.getMinecraftBedrockToken(keypair)
    console.log(XSTSToken)
}

doAuth()
```

### Password Authentication
```js
const { Authflow , Titles} = require('prismarine-auth');
const crypto = require('crypto')
const curve = 'secp384r1'

const keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve }).toString('base64') 

const doAuth = async() => {
    const flow = new Authflow('mineflayer@is.cool', './', { password: 'thisIsAFakePassword123', authTitle: Titles.MinecraftJava })
    const XSTSToken = await flow.getMinecraftBedrockToken(keypair)
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
Authflow class
- username {String} - Username for authentication
- cacheDirectory {String} - Where we will store your tokens
- options {Object?}
    - [password] {string} - If passed we will do password based authentication.
    - [authTitle] {string} - Required to switch to live.com authentication and do title authentication. Needed for accounts with a date of birth under 18 years old.
- onMsaCode {Function} - What we should do when we get the code. Useful for passing the code to another function.