/// <reference types="node" />

declare module 'prismarine-auth' {
  export class AuthFlow {
    constructor(username: string, cache: string, options?: MicrosoftAuthFlowOptions, codeCallback?: Function)
    initTokenCaches: (username: string, cache: string) => void
    resetTokenCaches: (cache: string) => boolean
    // Returns a Microsoft Oauth access token -- https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
    getMsaToken: () => string
    // Returns an XSTS token -- https://docs.microsoft.com/en-us/gaming/xbox-live/api-ref/xbox-live-rest/additional/edsauthorization
    getXboxToken: () => string
    // Returns a Minecraft Java Edition auth token
    getMinecraftJavaToken: (MinecraftJavaToken: object) => { token: string, entitlements: object, profile: object }
    // Returns a Minecraft Bedrock Edition auth token. Public key parameter must be a KeyLike object.
    getMinecraftBedrockToken: (publicKey) => string
  }
  export interface MinecraftJavaToken {
    fetchEntitlements: boolean
    fetchProfile: boolean
  }

  export interface MicrosoftAuthFlowOptions {
    relyingParty?: RelyingParty
    authTitle?: Titles
    password?: String
  }

  export enum Titles {
    MinecraftNintendoSwitch = '00000000441cc96b',
    MinecraftJava = '00000000402b5328'
  }

  export enum RelyingParty {
    PCXSTSRelyingParty = 'rp://api.minecraftservices.com/',
    BedrockXSTSRelyingParty = 'https://multiplayer.minecraft.net/',
    XboxXSTSRelyingParty = 'http://auth.xboxlive.com/'
  }
}
