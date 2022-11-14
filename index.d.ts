/// <reference types="node" />
import { KeyObject } from 'crypto'

declare module 'prismarine-auth' {
  export class Authflow {
    /**
     * Creates a new Authflow instance, which holds its own token cache
     * @param username A unique identifier. If using password auth, this should be an email.
     * @param cache Where to place token cache or a cache factory function.
     * @param options Options
     * @param codeCallback Optional callback to recieve token information using device code auth
     */
    constructor(username?: string, cache?: string | CacheFactory, options?: MicrosoftAuthFlowOptions, codeCallback?: (res: ServerDeviceCodeResponse) => void)
    /**
     * Deletes the caches in the specified cache directory.
     */
    static resetTokenCaches(cache: string): boolean

    // Returns a Microsoft Oauth access token -- https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
    getMsaToken(): Promise<string>
    // Returns an XSTS token -- https://docs.microsoft.com/en-us/gaming/xbox-live/api-ref/xbox-live-rest/additional/edsauthorization
    getXboxToken(relyingParty?: string): Promise<{
      userXUID: string,
      userHash: string,
      XSTSToken: string,
      expiresOn: number
    }>
    // Returns a Minecraft Java Edition auth token
    getMinecraftJavaToken(options?: {
      fetchCertificates?: boolean,
      fetchEntitlements?: boolean
      fetchProfile?: boolean
    }): Promise<{ token: string, entitlements: MinecraftJavaEntitlements, profile: MinecraftJavaProfile, certificates: MinecraftJavaCertificates }>
    // Returns a Minecraft Bedrock Edition auth token. Public key parameter must be a KeyLike object.
    getMinecraftBedrockToken(publicKey: KeyObject): Promise<string>
  }

  export interface MinecraftJavaEntitlements {
    items: MinecraftJavaEntitlementsItem[]
    signature: string
    keyId: string
  }

  export interface MinecraftJavaEntitlementsItem {
    name: string
    signature: string
  }

  export interface MinecraftJavaProfile {
    id: string
    name: string
    skins: MinecraftJavaProfileSkin[]
    capes: MinecraftJavaProfileCape[]
  }

  export interface MinecraftJavaProfileSkin {
    id: string,
    state: string,
    url: string,
    variant: 'CLASSIC'|'SLIM'
  }

  export interface MinecraftJavaProfileCape {
    id: string,
    state: string,
    url: string,
    alias: string
  }

  export interface MinecraftJavaCertificatesRaw {
    keyPair: {
      privateKey: string
      publicKey: string
    }
    publicKeySignature: string
    publicKeySignatureV2: string
    expiresAt: string
    refreshedAfter: string
  }

  export interface MinecraftJavaCertificates {
    profileKeys: {
      public: KeyObject
      private: KeyObject
      // PEM encoded keys from server
      publicPEM: string
      privatePEM: string
      // DER transformed keys
      publicDER: string,
      privateDER: string
    },
    expiresOn: string
    refreshAfter: string
  }

  export interface MicrosoftAuthFlowOptions {
    authTitle?: Titles
    deviceType?: string
    deviceVersion?: string
    password?: string
    flow: 'live' | 'msal' | 'sisu'
  }

  export enum Titles {
    MinecraftNintendoSwitch = '00000000441cc96b',
    MinecraftJava = '00000000402b5328'
  }

  export enum RelyingParty {
    PCXSTSRelyingParty = 'rp://api.minecraftservices.com/',
    BedrockXSTSRelyingParty = 'https://multiplayer.minecraft.net/',
    XboxAuthRelyingParty = 'http://auth.xboxlive.com/',
    XboxRelyingParty = 'http://xboxlive.com'
  }

  type ServerDeviceCodeResponse = {
      user_code: string
      device_code: string
      verification_uri: string
      expires_in: number
      interval: number
      message: string
  }

  export interface Cache {
    getCached(): Promise<any>
    setCached(value: any): Promise<void>
    setCachedPartial(value: any): Promise<void>
  }

  export type CacheFactory = (options: { username: string, cacheName: string }) => Cache
}
