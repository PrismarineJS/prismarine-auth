/// <reference types="node" />
import { KeyObject } from 'crypto'

declare module 'prismarine-auth' {
  export class Authflow {
    // List of cache names (identifiers) that are used by the Authflow class
    static CACHE_NAMES: string[]
    username: string
    options: MicrosoftAuthFlowOptions

    /**
     * Creates a new Authflow instance, which holds its own token cache
     * @param username A unique identifier. If using password auth, this should be an email.
     * @param cache Where to place token cache or a cache factory function.
     * @param options Options
     * @param codeCallback Optional callback to recieve token information using device code auth
     */
    constructor(username?: string, cacherOrDir?: string | CacheFactory, options?: MicrosoftAuthFlowOptions, codeCallback?: (res: ServerDeviceCodeResponse) => void)

    // Returns a Microsoft Oauth access token -- https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens
    getMsaToken(): Promise<string>
    // Returns an XSTS token -- https://docs.microsoft.com/en-us/gaming/xbox-live/api-ref/xbox-live-rest/additional/edsauthorization
    getXboxToken(relyingParty?: string, forceRefresh?: boolean): Promise<{
      userXUID: string,
      userHash: string,
      XSTSToken: string,
      expiresOn: number
    }>
    // Returns a Minecraft Java Edition auth token
    getMinecraftJavaToken(options?: {
      fetchCertificates?: boolean,
      fetchEntitlements?: boolean,
      fetchProfile?: boolean
    }): Promise<{ token: string, entitlements: MinecraftJavaEntitlements, profile: MinecraftJavaProfile, certificates: MinecraftJavaCertificates }>
    // Returns a Minecraft Bedrock Edition auth token. Public key parameter must be a KeyLike object.
    getMinecraftBedrockToken(publicKey: KeyObject): Promise<string>

    getMinecraftBedrockServicesToken(config: { version: string }): Promise<GetMinecraftBedrockServicesResponse>

    getPlayfabLogin(): Promise<GetPlayfabLoginResponse>

  }

  // via request to https://api.minecraftservices.com/entitlements/license, a list of licenses the player has
  // which includes available access via Xbox Game Pass subscriptions
  export interface MinecraftJavaLicenses {
    items: { name: string, source: string }[]
    signature: string
    keyId: string
    errors?: unknown[]
  }

  // via https://api.minecraftservices.com/entitlements/mcstore
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
    variant: 'CLASSIC' | 'SLIM'
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
    // If using Azure auth, specify an custom object to pass to MSAL
    msalConfig?: object
    authTitle?: Titles
    deviceType?: string
    deviceVersion?: string
    password?: string
    flow: 'live' | 'msal' | 'sisu'
    // Reset the cache and obtain fresh tokens for everything
    forceRefresh?: boolean,
    signal?: AbortSignal,
    // Extra scopes to add to the auth request. By default, this includes Xbox and offline_access scopes;
    // setting this will replace those scopes (but keep offline_access on MSAL flow which is required for caching).
    scopes: string[]
  }

  export enum Titles {
    MinecraftNintendoSwitch = '00000000441cc96b',
    MinecraftPlaystation = '000000004827c78e',
    MinecraftAndroid = '0000000048183522',
    MinecraftJava = '00000000402b5328',
    MinecraftIOS = '000000004c17c01a',
    XboxAppIOS = '000000004c12ae6f',
    XboxGamepassIOS = '000000004c20a908'
  }

  export enum RelyingParty {
    PCXSTSRelyingParty = 'rp://api.minecraftservices.com/',
    BedrockXSTSRelyingParty = 'https://multiplayer.minecraft.net/',
    XboxAuthRelyingParty = 'http://auth.xboxlive.com/',
    XboxRelyingParty = 'http://xboxlive.com'
  }

  type ServerDeviceCodeResponse = {
    userURL: string,
    userCode: string,
    deviceId: string,
    expiresInSeconds?: number,
    // The Unix timestamp in milliseconds when the device code expires
    expiresOn: number,
    checkingInterval?: number,
    message: string
  }

  export interface Cache {
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

  export interface CacheFactory {
    createCache(options: { username: string, cacheName: string }): Promise<Cache>
    hasCache(cacheName: string, identifier: string): Promise<boolean>
    deleteCache(cacheName: string, identifier: string): Promise<void>
    deleteCaches(cacheName: string): Promise<void>
    cleanup(): Promise<void>
  }

  export type GetMinecraftBedrockServicesResponse = {
    mcToken: string
    validUntil: string
    treatments: string[]
    treatmentContext: string
    configurations: object
  }

  export type GetPlayfabLoginResponse = {
    SessionTicket: string;
    PlayFabId: string;
    NewlyCreated: boolean;
    SettingsForUser: {
      NeedsAttribution: boolean;
      GatherDeviceInfo: boolean;
      GatherFocusInfo: boolean;
    };
    LastLoginTime: string;
    InfoResultPayload: {
      AccountInfo: {
        PlayFabId: string;
        Created: string;
        TitleInfo: {
          Origination: string;
          Created: string;
          LastLogin: string;
          FirstLogin: string;
          isBanned: boolean;
          TitlePlayerAccount: {
            Id: string;
            Type: string;
            TypeString: string;
          };
        };
        PrivateInfo: Record<string, unknown>;
        XboxInfo: {
          XboxUserId: string;
          XboxUserSandbox: string;
        };
      };
      UserInventory: any[];
      UserDataVersion: number;
      UserReadOnlyDataVersion: number;
      CharacterInventories: any[];
      PlayerProfile: {
        PublisherId: string;
        TitleId: string;
        PlayerId: string;
      };
    };
    EntityToken: {
      EntityToken: string;
      TokenExpiration: string;
      Entity: {
        Id: string;
        Type: string;
        TypeString: string;
      };
    };
    TreatmentAssignment: {
      Variants: any[];
      Variables: any[];
    };
  }

  export function createFileSystemCache(cacheDir: string, cacheIds: string[]): Promise<CacheFactory>
}
